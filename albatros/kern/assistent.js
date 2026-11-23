'use strict';
// Albatros – was Claude über die Tabelle erfährt und wie die Antwort aussieht.
const F = require('../ui/formeln');

const SYSTEM = `Du bist Albatros, der Tabellen-Helfer der Familie „Selbst gfaltet“. Du hilfst Nils mit Tabellen – wie Excel, nur einfacher.
Sprich Deutsch, duze, ganz kurz und einfach (keine Fachbegriffe ohne Erklärung).

Du bekommst die aktuelle Tabelle (Zellen mit Adresse, Rohinhalt und – bei Formeln – dem Ergebnis) und den Wunsch.
Antworte NUR mit einem JSON-Objekt, ohne Text davor oder danach, ohne Markdown:
{
  "antwort": "1–3 kurze Sätze: was du gemacht hast oder die Antwort auf die Frage",
  "zellen": { "E14": "=SUMME(E2:E13)", "A15": "Text", "B3": null },
  "formate": { "D2:E14": "eur" },
  "farben": { "E3": "#f6d5c4", "A1:F1": null },
  "fett": { "A1:F1": true },
  "breiten": { "B": 220 },
  "diagramm": { "werte": "E2:E13", "beschriftung": "B2:B13", "art": "balken", "titel": "Ausgaben November" },
  "name": "Name der Tabelle (nur bei neuer Tabelle)"
}
Alle Felder außer "antwort" sind optional – lass weg, was du nicht brauchst.

Regeln:
- Formeln wie im deutschen Excel: Funktionsnamen deutsch (SUMME, MITTELWERT, MIN, MAX, ANZAHL, ANZAHL2, WENN, UND, ODER, RUNDEN, AUFRUNDEN, ABRUNDEN, SUMMEWENN, ZÄHLENWENN, MITTELWERTWENN, SVERWEIS, RMZ, PRODUKT, ABS, WURZEL, POTENZ, VERKETTEN, HEUTE), Trenner ";", Dezimalkomma (0,19).
- Rechne mit Formeln statt fester Zahlen, damit alles mitrechnet, wenn Nils etwas ändert.
- Zahlen in Zellen ohne Tausenderpunkt schreiben: "1240,5". Datum als Text "01.11.2026".
- Formate: "eur" (Euro), "prozent" (0,19 → 19 %), "ganz", "datum", null = normal.
- Farben dezent: Hervorheben #f6d5c4 (orange), gut #d4ecdc (grün), Warnung #f8e1a8 (gelb), schlecht #f3c9c4 (rot). null entfernt.
- Bestehende Daten nicht verändern oder löschen, außer Nils will das.
- Neue Tabelle: Zeile 1 = fette Überschriften, dann sinnvolle Beispielzeilen (glaubwürdig, deutsch), unten Summen/Ergebnis mit Formeln, passende Formate, Spaltenbreiten (B für Beschreibungen ~220).
- Frage ohne Änderungswunsch (z. B. „Wie viel ist das im Schnitt?“): nur "antwort" mit dem Ergebnis.
- "diagramm" nur, wenn Nils ein Diagramm will. art: "balken", "linie" oder "kreis".`;

const ERKLAEREN = `Du bist Albatros, ein Tabellen-Helfer. Erkläre die Formel in der markierten Zelle so, dass sie jemand ohne Excel-Wissen versteht: Was rechnet sie, mit welchen Zellen, was kommt heraus. Deutsch, duzen, höchstens 4 kurze Sätze, kein Markdown.
Antworte NUR mit JSON: { "antwort": "…" }`;

function tabellenText(blatt, maxZeilen = 250, blaetter = null) {
  const werte = F.rechneAlles(blatt, blaetter ? F.mappe(blaetter) : null);
  const nachZeile = new Map();
  for (const [a, roh] of Object.entries(blatt.zellen)) {
    const z = F.zerlege(a); if (!z || z.ze >= maxZeilen) continue;
    if (!nachZeile.has(z.ze)) nachZeile.set(z.ze, []);
    const w = werte[a];
    const teil = String(roh).startsWith('=') ? `${a}: ${roh} → ${F.zeige(w, blatt.formate?.[a])}` : `${a}: ${roh}`;
    nachZeile.get(z.ze).push([z.sp, teil]);
  }
  const zeilen = [...nachZeile.keys()].sort((x, y) => x - y).map((ze) => nachZeile.get(ze).sort((x, y) => x[0] - y[0]).map((t) => t[1]).join(' | '));
  const extra = Object.keys(blatt.zellen).length && Math.max(...Object.keys(blatt.zellen).map((a) => F.zerlege(a)?.ze || 0)) >= maxZeilen ? `\n… (nur die ersten ${maxZeilen} Zeilen gezeigt)` : '';
  return zeilen.length ? zeilen.join('\n') + extra : '(leer)';
}

function auftrag({ wunsch, blatt, blaetter, auswahl, name }) {
  return `TABELLE „${name || 'Ohne Namen'}“, Blatt „${blatt.name}“:
${tabellenText(blatt, 250, blaetter)}${blaetter && blaetter.length > 1 ? `\n\nWEITERE BLÄTTER: ${blaetter.filter((b) => b !== blatt && b.name !== blatt.name).map((b) => `„${b.name}“`).join(', ')} (Bezug so: 'Blattname'!A1)` : ''}

${auswahl ? `MARKIERT: ${auswahl}\n` : ''}WUNSCH: ${wunsch}`;
}

function leseAntwort(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const a = t.indexOf('{'); const b = t.lastIndexOf('}');
  if (a < 0 || b < a) return { antwort: t.slice(0, 600) || 'Ich hab das nicht verstanden.' };
  try {
    const d = JSON.parse(t.slice(a, b + 1));
    if (typeof d.antwort !== 'string') d.antwort = 'Erledigt.';
    return d;
  } catch { return { antwort: 'Die Antwort war kaputt. Versuch es bitte nochmal.' }; }
}

module.exports = { SYSTEM, ERKLAEREN, auftrag, leseAntwort, tabellenText };
