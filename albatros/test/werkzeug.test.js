'use strict';
const test = require('node:test');
const assert = require('node:assert');
const F = require('../ui/formeln');
const W = require('../ui/werkzeug');

test('Ausfüllen: Zahlen, Datum, Monate, Text mit Nummer, Formeln', () => {
  assert.deepStrictEqual(W.fuelle(['1', '2'], 3), ['3', '4', '5']);
  assert.deepStrictEqual(W.fuelle(['5'], 2), ['5', '5']);
  assert.deepStrictEqual(W.fuelle(['5'], 2, { reihe: true }), ['6', '7']);
  assert.deepStrictEqual(W.fuelle(['0,5', '1'], 2), ['1,5', '2']);
  assert.deepStrictEqual(W.fuelle(['30.12.2026'], 3), ['31.12.2026', '01.01.2027', '02.01.2027']);
  assert.deepStrictEqual(W.fuelle(['31.01.2026', '28.02.2026'], 1).length, 1);
  assert.deepStrictEqual(W.fuelle(['15.01.2026', '15.02.2026'], 2), ['15.03.2026', '15.04.2026']);
  assert.deepStrictEqual(W.fuelle(['November'], 3), ['Dezember', 'Januar', 'Februar']);
  assert.deepStrictEqual(W.fuelle(['Mo'], 2), ['Di', 'Mi']);
  assert.deepStrictEqual(W.fuelle(['Woche 1'], 2), ['Woche 2', 'Woche 3']);
  assert.deepStrictEqual(W.fuelle(['=A1*2'], 2), ['=A2*2', '=A3*2']);
  assert.deepStrictEqual(W.fuelle(['=A1*2'], 2, { achse: 'sp' }), ['=B1*2', '=C1*2']);
  assert.deepStrictEqual(W.fuelle(['ja', 'nein'], 3), ['ja', 'nein', 'ja']);
  assert.deepStrictEqual(W.fuelle(['08:00'], 2), ['09:00', '10:00']);
});

test('Suchen, Ersetzen, Verbinden, Regeln, Filter, Pivot', () => {
  const b = { name: 'Kasse', zellen: { A1: 'Kategorie', B1: 'Betrag', C1: 'Monat', A2: 'Essen', B2: '10', C2: 'Nov', A3: 'Miete', B3: '800', C3: 'Nov', A4: 'Essen', B4: '-5', C4: 'Dez', A6: 'Summe', B6: '=SUMME(B2:B5)' }, formate: {}, verbunden: ['A8:C8'], regeln: [{ bereich: 'B2:B4', art: 'kleiner', wert: '0', farbe: '#f3c9c4' }, { bereich: 'A2:A4', art: 'doppelt', farbe: '#f8e1a8' }, { bereich: 'B2:B4', art: 'balken' }, { bereich: 'C2:C4', art: 'formel', wert: '=$B2>100', farbe: '#d4ecdc' }] };
  const r = F.rechner(b); const w = (a) => r.wert(a);
  assert.deepStrictEqual(W.finde(b, F.rechneAlles(b), 'essen'), ['A2', 'A4']);
  assert.strictEqual(W.ersetzeIn('Essen gehen', 'essen', 'Kino'), 'Kino gehen');
  assert.deepStrictEqual(W.verbundVon(b, 1, 7), { sp1: 0, ze1: 7, sp2: 2, ze2: 7 });
  assert.strictEqual(W.verdeckt(b).get('B8'), 'weg');
  assert.strictEqual(W.schiebeBereich('A2:C5', 3, 2, 'ze'), 'A2:C7');
  const st = W.regelnAuswerten(b, w);
  assert.strictEqual(st.get('B4').farbe, '#f3c9c4');
  assert.strictEqual(st.get('A2').farbe, '#f8e1a8');
  assert.ok(!st.get('A3')?.farbe);
  assert.ok(st.get('B3').balken.anteil > 0.9);
  assert.strictEqual(st.get('C3').farbe, '#d4ecdc');
  assert.ok(!st.get('C2'));
  b.filter = { kopf: 0, spalten: { A: ['Essen'] } };
  const weg = W.versteckteZeilen(b, w);
  assert.ok(weg.has(2) && weg.has(5) && !weg.has(1));
  const p = W.pivot(b, w, { kopf: 0, zeilen: 0, wert: 1, art: 'SUMME' });
  const pw = F.rechneAlles(p, F.mappe([b, p]));
  assert.strictEqual(p.zellen.A2, 'Essen'); assert.strictEqual(pw.B2, 5); assert.strictEqual(pw.B3, 800); assert.strictEqual(pw.B4, 805);
  const p2 = W.pivot(b, w, { kopf: 0, zeilen: 0, spalten: 2, wert: 1, art: 'SUMME' });
  const pw2 = F.rechneAlles(p2, F.mappe([b, p2]));
  assert.strictEqual(p2.zellen.B1, 'Dez'); assert.strictEqual(pw2.B2, -5); assert.strictEqual(pw2.C2, 10); assert.strictEqual(pw2.D2, 5);
});
