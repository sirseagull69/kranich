'use strict';
const test = require('node:test');
const assert = require('node:assert');
const F = require('../ui/formeln');
const r = (z) => F.rechneAlles({ zellen: z });

const DATEN = { A1: 'Datum', B1: 'Kategorie', C1: 'Betrag', A2: '01.11.2026', B2: 'Miete', C2: '820', A3: '04.11.2026', B3: 'Essen', C3: '86,40', A4: '12.12.2026', B4: 'Essen', C4: '40', A5: '15.12.2026', B5: 'Auto', C5: '62,10' };

test('Nachschlagen: XVERWEIS, INDEX, VERGLEICH, SVERWEIS', () => {
  const w = r({ ...DATEN, E1: '=XVERWEIS("Auto";B2:B5;C2:C5)', E2: '=XVERWEIS("Urlaub";B2:B5;C2:C5;"gibt\'s nicht")', E3: '=XVERWEIS("Urlaub";B2:B5;C2:C5)', E4: '=INDEX(C2:C5;VERGLEICH("Essen";B2:B5;0))', E5: '=INDEX(A2:C5;2;3)', E6: '=VERGLEICH(50;C2:C5;1)', E7: '=SVERWEIS("au*";B2:C5;2;FALSCH)', E8: '=XLOOKUP("Miete",B2:B5,C2:C5)' });
  assert.strictEqual(w.E1, 62.1);
  assert.strictEqual(w.E2, "gibt's nicht");
  assert.strictEqual(w.E3.code, '#NV');
  assert.strictEqual(w.E4, 86.4);
  assert.strictEqual(w.E5, 86.4);
  assert.strictEqual(w.E7, 62.1);
  assert.strictEqual(w.E8, 820);
});

test('Fehler abfangen und mehrere Bedingungen', () => {
  const w = r({ ...DATEN, E1: '=WENNFEHLER(1/0;"–")', E2: '=WENNFEHLER(SVERWEIS("x";B2:C5;2;0);0)', E3: '=SUMMEWENNS(C2:C5;B2:B5;"Essen";A2:A5;">=01.12.2026")', E4: '=ZÄHLENWENNS(B2:B5;"Essen";C2:C5;">50")', E5: '=ZAEHLENWENNS(B2:B5;"<>Essen")', E6: '=MITTELWERTWENNS(C2:C5;B2:B5;"Essen")', E7: '=WENNS(C2>1000;"hoch";C2>500;"mittel";WAHR;"klein")', E8: '=ISTFEHLER(1/0)', E9: '=MAXWENNS(C2:C5;B2:B5;"Essen")' });
  assert.strictEqual(w.E1, '–');
  assert.strictEqual(w.E2, 0);
  assert.strictEqual(w.E3, 40);
  assert.strictEqual(w.E4, 1);
  assert.strictEqual(w.E5, 2);
  assert.ok(Math.abs(w.E6 - 63.2) < 1e-9);
  assert.strictEqual(w.E7, 'mittel');
  assert.strictEqual(w.E8, true);
  assert.strictEqual(w.E9, 86.4);
});

test('Datum und Text', () => {
  const w = r({ ...DATEN, E1: '=MONAT(A2)', E2: '=JAHR(A5)', E3: '=TAG(A3)', E4: '=TEXT(A2;"TT.MM.JJJJ")', E5: '=TEXT(1234,5;"#.##0,00 €")', E6: '=TEXT(A2;"MMMM")', E7: '=DATUM(2026;12;24)-A2', E8: '=WOCHENTAG(A2;2)', E9: '=LINKS("Albatros";3)&RECHTS("Albatros";2)', E10: '=WECHSELN("a-b-c";"-";"/")', E11: '=GLÄTTEN("  zu   viel  ")', E12: '=TEXT(0,256;"0,0 %")', E13: '=A3-A2', E14: '=ISOKALENDERWOCHE(A2)', E15: '=MONATSENDE(A2;0)', E16: '=TEXT(EDATUM("31.01.2026";1);"TT.MM.")', E17: '=NETTOARBEITSTAGE("02.11.2026";"13.11.2026")', E18: '=TEIL("Haushaltsbuch";6;5)', E19: '=TEXTVERKETTEN(", ";WAHR;B2:B5)', E20: '=GROSS("ä")' });
  assert.strictEqual(w.E1, 11);
  assert.strictEqual(w.E2, 2026);
  assert.strictEqual(w.E3, 4);
  assert.strictEqual(w.E4, '01.11.2026');
  assert.strictEqual(w.E5, '1.234,50 €');
  assert.strictEqual(w.E6, 'November');
  assert.strictEqual(w.E7, 53);
  assert.strictEqual(w.E8, 7); // 01.11.2026 ist ein Sonntag
  assert.strictEqual(w.E9, 'Albos');
  assert.strictEqual(w.E10, 'a/b/c');
  assert.strictEqual(w.E11, 'zu viel');
  assert.strictEqual(w.E12, '25,6 %');
  assert.strictEqual(w.E13, 3);
  assert.strictEqual(w.E14, 44);
  assert.strictEqual(F.zeige(w.E15, 'datum'), '30.11.2026');
  assert.strictEqual(w.E16, '28.02.');
  assert.strictEqual(w.E17, 10);
  assert.strictEqual(w.E18, 'altsb');
  assert.strictEqual(w.E19, 'Miete, Essen, Essen, Auto');
  assert.strictEqual(w.E20, 'Ä');
  assert.strictEqual(F.datumArt('14:30'), 'uhrzeit');
  assert.strictEqual(F.zeige(F.datumZahl('14:30'), 'uhrzeit'), '14:30');
});

test('Ergebnisse über mehrere Zellen: EINDEUTIG, FILTER, SORTIEREN, Feldrechnung', () => {
  const w = r({ ...DATEN, E1: '=EINDEUTIG(B2:B5)', F1: '=SUMMEWENN(B2:B5;E1;C2:C5)', G1: '=FILTER(C2:C5;B2:B5="Essen")', H1: '=SORTIEREN(C2:C5;1;-1)', I1: '=SUMME(C2:C5*(B2:B5="Essen"))', J1: '=SEQUENZ(3)', K1: '=C2:C3*2' });
  assert.deepStrictEqual([w.E1, w.E2, w.E3], ['Miete', 'Essen', 'Auto']);
  assert.strictEqual(w.F1, 820);
  assert.deepStrictEqual([w.G1, w.G2], [86.4, 40]);
  assert.ok(w.G3 === undefined || w.G3 === null);
  assert.deepStrictEqual([w.H1, w.H4], [820, 40]);
  assert.ok(Math.abs(w.I1 - 126.4) < 1e-9);
  assert.deepStrictEqual([w.J1, w.J2, w.J3], [1, 2, 3]);
  assert.deepStrictEqual([w.K1, w.K2], [1640, 172.8]);
  // Platz belegt → #ÜBERLAUF!
  const v = r({ A1: '=SEQUENZ(3)', A2: 'x' });
  assert.strictEqual(v.A1.code, '#ÜBERLAUF!');
  // Bezug auf übergelaufene Zelle
  const u = r({ A1: '=SEQUENZ(3)', B1: '=A3*10' });
  assert.strictEqual(u.B1, 30);
});

test('Ganze Spalten, Rang, Rest', () => {
  const w = r({ ...DATEN, E1: '=SUMME(C:C)', E2: '=SUMMEWENN(B:B;"Essen";C:C)', E3: '=RANG.GLEICH(62,1;C2:C5)', E4: '=REST(-7;3)', E5: '=KGRÖSSTE(C2:C5;2)', E6: '=MEDIAN(C2:C5)', E7: '=SUMMENPRODUKT(C2:C3;C2:C3)' });
  assert.ok(Math.abs(w.E1 - 1008.5) < 1e-9);
  assert.ok(Math.abs(w.E2 - 126.4) < 1e-9);
  assert.strictEqual(w.E3, 3);
  assert.strictEqual(w.E4, 2);
  assert.strictEqual(w.E5, 86.4);
  assert.ok(Math.abs(w.E6 - 74.25) < 1e-9);
  assert.ok(Math.abs(w.E7 - (820 * 820 + 86.4 * 86.4)) < 1e-6);
});

test('Excel-Namen der neuen Funktionen', () => {
  assert.strictEqual(F.nachExcel('=XVERWEIS(A1;B:B;C:C)'), '=_xlfn.XLOOKUP(A1,B:B,C:C)');
  assert.strictEqual(F.nachExcel('=FILTER(A1:A9;B1:B9>0)'), '=_xlfn._xlws.FILTER(A1:A9,B1:B9>0)');
  assert.strictEqual(F.vonExcel('=_xlfn._xlws.SORT(A1:A3)'), '=SORTIEREN(A1:A3)');
  assert.strictEqual(F.vonExcel('=IFERROR(VLOOKUP(A1,B:C,2,FALSE),0)'), '=WENNFEHLER(SVERWEIS(A1;B:C;2;FALSE);0)');
  assert.strictEqual(F.nachExcel('=SUMMEWENNS(C:C;B:B;"x")'), '=SUMIFS(C:C,B:B,"x")');
});
