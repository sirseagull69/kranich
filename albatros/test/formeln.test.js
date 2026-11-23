'use strict';
const test = require('node:test');
const assert = require('node:assert');
const F = require('../ui/formeln');
const r = (z) => F.rechneAlles({ zellen: z });

test('Grundrechnen und Funktionen', () => {
  const w = r({ A1: '10', A2: '20,5', A3: '1.240,00', A4: '=SUMME(A1:A3)', A5: '=MITTELWERT(A1:A2)', A6: '=A1*0,19', A7: '=WENN(A1>5;"groß";"klein")', A8: '=RUNDEN(A2/3;1)', A9: '=SUM(A1,A2)', B1: 'Miete', B2: 'Essen', B3: 'Miete', C1: '=SUMMEWENN(B1:B3;"Miete";A1:A3)', C2: '=ZÄHLENWENN(B1:B3;"Miete")', C3: '=A1/0', C4: '=C4+1', C5: '=10%', C6: '=-A1^2', C7: '="Summe: "&A4' });
  assert.strictEqual(w.A4, 1270.5);
  assert.strictEqual(w.A5, 15.25);
  assert.ok(Math.abs(w.A6 - 1.9) < 1e-9);
  assert.strictEqual(w.A7, 'groß');
  assert.strictEqual(w.A8, 6.8);
  assert.strictEqual(w.A9, 30.5);
  assert.strictEqual(w.C1, 1250);
  assert.strictEqual(w.C2, 2);
  assert.strictEqual(w.C3.code, '#DIV/0!');
  assert.strictEqual(w.C4.code, '#KREIS!');
  assert.strictEqual(w.C5, 0.1);
  assert.strictEqual(w.C6, 100); // wie Excel
  assert.strictEqual(w.C7, 'Summe: 1.270,5');
});

test('Ratenkredit und SVERWEIS', () => {
  const w = r({ A1: '=RUNDEN(RMZ(5%/12;60;10000);2)', B1: 'Äpfel', C1: '2', B2: 'Birnen', C2: '3', D1: '=SVERWEIS("Birnen";B1:C2;2;FALSCH)' });
  assert.strictEqual(w.A1, -188.71);
  assert.strictEqual(w.D1, 3);
});

test('Excel umwandeln und verschieben', () => {
  assert.strictEqual(F.nachExcel('=SUMME(A1:A3;0,5)*ZÄHLENWENN(B1:B3;"x;y")'), '=SUM(A1:A3,0.5)*COUNTIF(B1:B3,"x;y")');
  assert.strictEqual(F.vonExcel('=IF(A1>0.5,SUM(A1:A2),"a,b")'), '=WENN(A1>0,5;SUMME(A1:A2);"a,b")');
  assert.strictEqual(F.verschiebe('=A1+$B$2+C$3', 1, 2), '=B3+$B$2+D$3');
  assert.strictEqual(F.zeige(1486.4, 'eur'), '1.486,40 €');
});
