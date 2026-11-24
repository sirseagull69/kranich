'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { docxSchreiben, docxLesen } = require('../kern/docx');

test('docx: schreiben und wieder lesen', async () => {
  const bloecke = [
    { art: 'h1', laeufe: [{ t: 'Einladung' }] },
    { art: 'p', laeufe: [{ t: 'Am ' }, { t: 'Freitag', f: true }, { t: ' & bei ' }, { t: 'uns', k: true, u: true }] },
    { art: 'ul', laeufe: [{ t: 'Glühwein' }] }, { art: 'ul', laeufe: [{ t: 'Buffet' }] },
    { art: 'ol', laeufe: [{ t: 'Eins' }] }, { art: 'p', laeufe: [{ t: 'Zwischen' }] }, { art: 'ol', laeufe: [{ t: 'Wieder eins' }] },
    { art: 'h2', ausrichtung: 'center', laeufe: [{ t: 'Zeile1\nZeile2' }] },
  ];
  const buf = await docxSchreiben(bloecke, 'Test');
  assert.ok(buf.length > 1000);
  const html = await docxLesen(buf);
  assert.match(html, /<h1>Einladung<\/h1>/);
  assert.match(html, /<strong>Freitag<\/strong>/);
  assert.match(html, /&amp; bei/);
  assert.match(html, /<ul><li>Glühwein<\/li><li>Buffet<\/li><\/ul>/);
  assert.match(html, /<ol><li>Eins<\/li><\/ol>/);
  assert.match(html, /<h2>Zeile1<br \/>Zeile2<\/h2>/);
});
