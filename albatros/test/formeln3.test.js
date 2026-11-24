'use strict';
const test = require('node:test');
const assert = require('node:assert');
const F = require('../ui/formeln');
const r = (z) => F.rechneAlles({ zellen: z });
const nah = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`);

test('Neue Funktionen: Statistik, Mathe, Text, Datum, Finanzen', () => {
  const w = r({ A1: '2', A2: '4', A3: '4', A4: '5', A5: '7', A6: '9',
    B1: '=STABW.S(A1:A6)', B2: '=STABW.N(A1:A6)', B3: '=MODUS.EINF(A1:A6)', B4: '=OBERGRENZE(7,3;0,5)', B5: '=UNTERGRENZE(7,3;0,5)', B6: '=LOG(1000)',
    C1: '=TEXTVOR("max@firma.de";"@")', C2: '=TEXTNACH("max@firma.de";"@")', C3: '=WIEDERHOLEN("ab";3)', C4: '=ERSTERWERT(2;1;"eins";2;"zwei";"sonst")', C5: '=IDENTISCH("A";"a")',
    D1: '=DATEDIF(DATUM(2000;5;15);DATUM(2026;11;24);"Y")', D2: '=DATEDIF(DATUM(2026;1;31);DATUM(2026;3;1);"M")', D3: '=ARBEITSTAG(DATUM(2026;11;20);1)', D4: '=ZEILEN(A1:A6)',
    E1: '=RUNDEN(ZW(0,05;10;-100);2)', E2: '=RUNDEN(BW(0,05;10;-100);2)', E3: '=RUNDEN(NBW(0,1;100;100);4)', E4: '=VRUNDEN(17;5)' });
  nah(w.B1, 2.483277404); nah(w.B2, 2.266911751); assert.strictEqual(w.B3, 4); assert.strictEqual(w.B4, 7.5); assert.strictEqual(w.B5, 7); nah(w.B6, 3);
  assert.strictEqual(w.C1, 'max'); assert.strictEqual(w.C2, 'firma.de'); assert.strictEqual(w.C3, 'ababab'); assert.strictEqual(w.C4, 'zwei'); assert.strictEqual(w.C5, false);
  assert.strictEqual(w.D1, 26); assert.strictEqual(w.D2, 1); assert.strictEqual(w.D4, 6);
  assert.strictEqual(w.D3, r({ A1: '=DATUM(2026;11;23)' }).A1); // Fr → Mo
  assert.strictEqual(w.E1, 1257.79); assert.strictEqual(w.E2, 772.17); nah(w.E3, 173.5537); assert.strictEqual(w.E4, 15);
});
