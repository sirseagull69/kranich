'use strict';
// Der Look der origami-Familie, so wie Kranich ihn kennt.
// Wird jedem Entwurfsauftrag mitgegeben. Nils kann ihn in den Einstellungen
// ergänzen ("Eigene Hinweise zum Look").

const APPS = {
  kranich: { name: 'Kranich', farbe: '#7c5cd6', facette: '#4a2f9a', hell: '#d6caf9', aufgabe: 'Entwerfen und Bilder bearbeiten' },
  origami: { name: 'origami', farbe: '#e8743b', facette: '#b4521f', hell: '#f8d3bd', aufgabe: 'KI-Assistent, steckt als Copilot in jeder App' },
  eule: { name: 'Eule', farbe: '#c47f17', facette: '#8a5512', hell: '#f3dcb2', aufgabe: 'Schreiben (statt Word)' },
  elster: { name: 'Elster', farbe: '#1f7a74', facette: '#135450', hell: '#dcefec', aufgabe: 'Rechnen und Tabellen (statt Excel)' },
};

const GRUNDLOOK = `
DER LOOK DER ORIGAMI-FAMILIE (Papier-Design)
- Grund: warmes Papier #f6f1e7, Flächen #fffdf8, Karten weiß. Optional feines Punktraster.
- Tinte (Text): #1d2742, leiser Text #5b6170, Linien #d9d0bc.
- Jede App hat eine Hausfarbe mit dunkler Facette und hellem Ton (siehe unten).
- Schrift: Überschriften und Knöpfe "Bricolage Grotesque" (700/800), Fließtext "Source Serif 4", handschriftliche Randnotizen "Caveat".
- Falt-Details statt Rundungen: Karten und Hauptknöpfe mit abgeknickter Ecke oben rechts
  (clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)), kleine Radien (2–3 px),
  gestrichelte Falzlinien (border-top: 2px dashed #d9d0bc) als Trenner, Eselsohr unten rechts.
- Registerlaschen für Reiter und Seitenlisten, Chips mit voller Rundung für Status.
- Schatten weich und flach (0 1px 2px rgba(30,40,70,.08), 0 10px 24px rgba(30,40,70,.10)).
- Klickflächen mindestens 40 px hoch. Deutsche, normale Wörter, keine Fachsprache.
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

module.exports = { APPS, lookText };
