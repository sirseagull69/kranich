'use strict';
const test = require('node:test');
const assert = require('node:assert');
const JSZip = require('jszip');
const { docxSchreiben, docxLesen } = require('../kern/docx');

// 1×1 Pixel PNG
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('docx: Text, Listen, Zeilenumbruch', async () => {
  const bloecke = [
    { art: 'h1', laeufe: [{ t: 'Einladung' }] },
    { art: 'p', laeufe: [{ t: 'Am ' }, { t: 'Freitag', f: true }, { t: ' & bei ' }, { t: 'uns', k: true, u: true }] },
    { art: 'ul', laeufe: [{ t: 'Glühwein' }] }, { art: 'ul', laeufe: [{ t: 'Buffet' }] },
    { art: 'ol', laeufe: [{ t: 'Eins' }] }, { art: 'p', laeufe: [{ t: 'Zwischen' }] }, { art: 'ol', laeufe: [{ t: 'Wieder eins' }] },
    { art: 'h2', ausrichtung: 'center', laeufe: [{ t: 'Zeile1\nZeile2' }] },
  ];
  const { html } = await docxLesen(await docxSchreiben(bloecke, 'Test'));
  assert.match(html, /<h1>Einladung<\/h1>/);
  assert.match(html, /<strong>Freitag<\/strong>/);
  assert.match(html, /&amp; bei/);
  assert.match(html, /<ul><li>Glühwein<\/li><li>Buffet<\/li><\/ul>/);
  assert.match(html, /<ol><li>Eins<\/li><\/ol>/);
  assert.match(html, /<h2>Zeile1<br \/>Zeile2<\/h2>/);
});

test('docx: Tabelle, Bild, Link, Seitenumbruch kommen wieder raus', async () => {
  const bloecke = [
    { art: 'tabelle', zeilen: [[{ kopf: true, laeufe: [{ t: 'Programm' }] }, { kopf: true, laeufe: [{ t: 'Wer' }] }], [{ laeufe: [{ t: 'Office' }] }, { laeufe: [{ t: 'Nils' }] }]] },
    { art: 'bild', typ: 'png', daten: PNG, breite: 120, hoehe: 80 },
    { art: 'p', laeufe: [{ t: 'Mehr auf ' }, { t: 'selbstgfaltet.de', link: 'https://www.selbstgfaltet.de' }] },
    { art: 'umbruch' },
    { art: 'p', laeufe: [{ t: 'Seite zwei', groesse: 16, farbe: '#b23a28', mark: '#fff59d', schrift: 'Arial' }] },
  ];
  const buf = await docxSchreiben(bloecke, 'Test');
  const { html } = await docxLesen(buf);
  assert.match(html, /<table>/);
  assert.match(html, /Programm/);
  assert.match(html, /<td><p>Office<\/p><\/td>/);
  assert.match(html, /<img src="data:image\/png;base64,/);
  assert.match(html, /<a href="https:\/\/www.selbstgfaltet.de">(<u>)?selbstgfaltet.de(<\/u>)?<\/a>/);
  const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
  assert.match(xml, /<w:br w:type="page"\/>/);
  assert.match(xml, /<w:sz w:val="32"\/>/);
  assert.match(xml, /<w:color w:val="B23A28"\/>/);
  assert.match(xml, /<w:highlight w:val="yellow"\/>/);
  assert.match(xml, /w:ascii="Arial"/);
});

test('docx: Kopf-/Fußzeile mit Seitenzahl und Inhaltsverzeichnis', async () => {
  const buf = await docxSchreiben([{ art: 'inhalt' }, { art: 'h1', laeufe: [{ t: 'Kapitel' }] }], 'Test', { kopf: 'Ritterwand IT', fuss: 'Nils', seitenzahlen: true });
  const zip = await JSZip.loadAsync(buf);
  assert.ok(zip.file('word/header1.xml'));
  assert.match(await zip.file('word/footer1.xml').async('string'), / PAGE /);
  assert.match(await zip.file('word/document.xml').async('string'), / TOC /);
  const r = await docxLesen(buf);
  assert.strictEqual(r.kopf, 'Ritterwand IT');
  assert.strictEqual(r.fuss, 'Nils');
  assert.strictEqual(r.seitenzahlen, true);
});

test('docx: Tabellenraster ist gültiges XML, Marker nach Farbton', async () => {
  const buf = await docxSchreiben([{ art: 'tabelle', zeilen: [[{ laeufe: [{ t: 'a' }] }, { laeufe: [{ t: 'b' }] }, { laeufe: [{ t: 'c' }] }]] }, { art: 'p', laeufe: [{ t: 'x', mark: '#c8f7c5' }, { t: 'y', mark: '#b3e5fc' }, { t: 'z', mark: '#f8bbd0' }] }]);
  const xml = await (await JSZip.loadAsync(buf)).file('word/document.xml').async('string');
  assert.strictEqual((xml.match(/<w:gridCol /g) || []).length, 3);
  assert.doesNotMatch(xml, /\/>"\/>/);
  assert.match(xml, /w:highlight w:val="green"/);
  assert.match(xml, /w:highlight w:val="cyan"/);
  assert.match(xml, /w:highlight w:val="(red|magenta)"/);
});
