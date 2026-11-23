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
