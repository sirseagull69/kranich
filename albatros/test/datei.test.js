'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const D = require('../kern/datei');

test('Excel hin und zurück, CSV lesen', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alb-'));
  const t = { name: 'Test', blaetter: [{ name: 'Kasse', zellen: { A1: 'Was', B1: 'Betrag', A2: 'Miete', B2: '420,5', A3: 'Summe', B3: '=SUMME(B2:B2)*1,5' }, formate: { B2: 'eur' }, farben: { B2: '#f6d5c4' }, fett: { A3: true }, breiten: { A: 180 } }] };
  const f = path.join(dir, 't.xlsx');
  await D.xlsxSchreiben(t, f);
  const b = await D.xlsxLesen(f);
  assert.strictEqual(b[0].name, 'Kasse');
  assert.strictEqual(b[0].zellen.B3, '=SUMME(B2:B2)*1,5');
  assert.strictEqual(b[0].zellen.B2, '420,5');
  assert.strictEqual(b[0].formate.B2, 'eur');
  assert.strictEqual(b[0].fett.A3, true);
  const c = D.csvLesen('Name;Betrag\r\n"Müller; Hans";12,50\r\n');
  assert.strictEqual(c[0].zellen.A2, 'Müller; Hans');
  assert.strictEqual(c[0].zellen.B2, '12,50');
  assert.match(D.csvSchreiben(t.blaetter[0]), /Summe;630,75/);
});

test('Excel: verbunden, fixiert, Regeln, Listen, Datum, Makros', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alb-'));
  const t = { name: 'T', blaetter: [{ name: 'Daten', zellen: { A1: 'Titel', A2: 'Datum', B2: 'Kat', C2: 'Betrag', A3: '01.11.2026', B3: 'Essen', C3: '-5', A4: '14:30', C4: '=XVERWEIS("Essen";B3:B4;C3:C4)' }, formate: { C3: 'eur' }, farben: {}, fett: {}, breiten: {}, verbunden: ['A1:C1'], fixiert: { ze: 2, sp: 0 }, regeln: [{ bereich: 'C3:C9', art: 'kleiner', wert: '0', farbe: '#f3c9c4' }, { bereich: 'B3:B9', art: 'doppelt', farbe: '#f8e1a8' }], listen: { 'B3:B9': { werte: ['Essen', 'Miete'] } } }] };
  const f = path.join(dir, 't.xlsx');
  await D.xlsxSchreiben(t, f);
  const [b] = await D.xlsxLesen(f);
  assert.deepStrictEqual(b.verbunden, ['A1:C1']);
  assert.deepStrictEqual(b.fixiert, { sp: 0, ze: 2 });
  assert.strictEqual(b.formate.A3, 'datum');
  assert.strictEqual(b.formate.A4, 'uhrzeit');
  assert.strictEqual(b.zellen.C4, '=XVERWEIS("Essen";B3:B4;C3:C4)');
  assert.ok(b.regeln.some((r) => r.art === 'kleiner' && r.farbe === '#f3c9c4' && r.wert === '0'));
  assert.deepStrictEqual(b.listen['B3:B9'], { werte: ['Essen', 'Miete'] });
  // .xlsm mit Makro: nur lesen, nicht ausführen
  const V = require('../kern/vba');
  const bin = fs.readFileSync(path.join(__dirname, 'daten', 'vbaProject.bin'));
  assert.match(V.moduleLesen(bin)[0].code, /Sub say_hello/);
});
