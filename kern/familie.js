'use strict';
// Der Look der origami-Familie, so wie Kranich ihn kennt.
// Wird jedem Entwurfsauftrag mitgegeben. Nils kann ihn in den Einstellungen
// ergänzen ("Eigene Hinweise zum Look").

const APPS = {
  kranich: { name: 'Kranich', farbe: '#7c5cd6', facette: '#4a2f9a', hell: '#d6caf9', aufgabe: 'Entwerfen und Bilder bearbeiten' },
  origami: { name: 'origami', farbe: '#e8743b', facette: '#b4521f', hell: '#f8d3bd', aufgabe: 'KI-Assistent, steckt als Copilot in jeder App' },
  albatros: { name: 'Albatros', farbe: '#2f8a55', facette: '#1d5e3a', hell: '#dcf0e3', aufgabe: 'Tabellen und Rechnen (statt Excel), einfacher und mit viel Hilfe von origami' },
  schreiben: { name: 'Schreibprogramm (Name folgt)', farbe: '#c47f17', facette: '#8a5512', hell: '#f3dcb2', aufgabe: 'Schreiben (statt Word)' },
};

const GRUNDLOOK = `
DER LOOK DER FAMILIE „SELBST GFALTET“ (Stand: klarer Look, wie das Startfenster)
- Grund: warmes Papier #f4f0e8 mit feinem Punktraster (radial-gradient, 18 px). Karten und Flächen #fffdf9, Radius 4–12 px.
- Tinte (Text): #1d2742, leiser Text #5b6170, Linien #ebe5d8, gestrichelte Trenner 1.5px dashed #e6dfd0.
- Schatten weich und flach: 0 1px 2px rgba(30,40,70,.08), 0 10px 24px rgba(30,40,70,.10). Keine harten Rahmen.
- Jede App hat eine Hausfarbe mit dunkler Facette und hellem Ton (siehe unten). Hauptknopf in der Hausfarbe, Radius 10 px.
- Schrift: Überschriften und Knöpfe "Bricolage Grotesque" (700/800, große Überschrift 40 px, Zeilenhöhe 1.08),
  Fließtext "Source Serif 4", eine handschriftliche Zeile über der Überschrift in "Caveat" in der Hausfarbe.
- Aufbau: ruhiger Kopf ohne Balken (Vogel + Name links, Status-Chip und runde Symbolknöpfe rechts), viel Luft,
  Inhalt max. 1240 px breit. Startseiten: Gruß + große Frage, darunter ein Eingabe-Blatt, darunter 4 Karten mit
  hellem Bildfeld in der Hausfarbe und dem Vogel darin, darunter zwei Blätter („Zum Ausprobieren“, „Zuletzt …“).
- Arbeitsflächen: links ein Blatt mit Listen (kleine Großbuchstaben-Überschriften), Mitte die Fläche, rechts ein
  Blatt für den Helfer/Chat mit Sprechblasen (eigene Nachricht in der Hausfarbe, rechts).
- Die Vögel sind flache Papier-Origami aus Dreiecken (wie Ori): Schwanz, Körper, weißer Flügel, Hals, Kopf/Schnabel, Kiel.
- Bewegung: Elemente gleiten beim Öffnen sanft hoch, Fenster klappen auf wie Papier.
- Klickflächen mindestens 40 px hoch. Deutsche, normale Wörter, keine Fachsprache. Keine Emojis, keine Fotos.
`.trim();

function appListe() {
  return Object.values(APPS)
    .map((a) => `- ${a.name}: Hausfarbe ${a.farbe}, Facette ${a.facette}, hell ${a.hell} (${a.aufgabe})`)
    .join('\n');
}

function lookText(eigeneHinweise = '') {
  let text = `${GRUNDLOOK}\n\nAPPS DER FAMILIE (Sammlung „Selbst gfaltet“)\n${appListe()}`;
  if (eigeneHinweise && eigeneHinweise.trim()) text += `\n\nEIGENE HINWEISE VON NILS\n${eigeneHinweise.trim()}`;
  return text;
}

// Fotos vom aktuellen Stand der Apps (ui/stand), passend zum Wunsch
const STAND = {
  kranich: ['kranich-start.jpg', 'kranich-arbeitsflaeche.jpg'],
  albatros: ['albatros-start.jpg', 'albatros-tabelle.jpg'],
  startfenster: ['startfenster.jpg'],
};
function standFuer(text = '') {
  const t = String(text).toLowerCase();
  const aus = [];
  if (/kranich/.test(t)) aus.push(...STAND.kranich);
  if (/albatros/.test(t)) aus.push(...STAND.albatros);
  if (/startfenster|launcher|selbst gfaltet|sammlung/.test(t)) aus.push(...STAND.startfenster);
  return [...new Set(aus)].slice(0, 4);
}
const STAND_HINWEIS = 'Angehängt sind Bildschirmfotos vom AKTUELLEN Stand der genannten App(s) der Familie (mit dem Werkzeug Read ansehen). Orientier dich daran: was es schon gibt, wie es aussieht. Verbessere es, ohne den Charakter der Familie zu verlieren.';

module.exports = { APPS, lookText, standFuer, STAND_HINWEIS };
