'use strict';
// Die Aufträge, die Kranich an das Hirn schickt, und das Auslesen der Antworten.
// Alles hier ist reine Textarbeit und ohne Netz testbar.

const { lookText } = require('./familie');

const RICHTUNGEN = [
  { name: 'Ruhig', hinweis: 'Viel Luft, leise Farben, der Inhalt steht im Mittelpunkt.' },
  { name: 'Mutig', hinweis: 'Kräftige Flächen in der Hausfarbe, große Schrift, ein starker Hauptknopf.' },
  { name: 'Kompakt', hinweis: 'Enge Zeilen, Seitenleiste oder Raster, mehr auf einen Blick.' },
];

function systemEntwurf(einstellungen = {}) {
  return `Du bist Kranich, die Entwurfsmaschine der origami-Familie. Du baust Oberflächen als EINE vollständige HTML-Datei.

REGELN FÜR DAS HTML
- Genau ein Dokument: <!doctype html> … </html>. Alles CSS in einem <style> im <head>. Kein JavaScript, keine externen Bilder.
- Schriften über Google Fonts per <link> sind erlaubt (Bricolage Grotesque, Source Serif 4, Caveat).
- Das Dokument füllt genau die vorgegebene Fläche (html, body { margin:0; width/height wie angegeben; overflow:hidden }).
- Echte, glaubwürdige deutsche Beispielinhalte, keine Platzhalter wie "Lorem ipsum".
- Gib jedem sichtbaren Baustein ein Attribut data-name mit einem kurzen deutschen Namen (z. B. data-name="Knopf „Neue Aufgabe“").
- Vorhandene Attribute data-k und data-name bleiben an ihren Elementen stehen, wenn du etwas änderst.
- Bilder als Inline-SVG zeichnen, wenn nötig.

ANTWORT
Zuerst eine Zeile "NOTIZ: …" mit einem kurzen Satz in normalem Deutsch, was du gemacht hast (du sprichst Nils mit du an).
Danach nur das HTML in einem Block \`\`\`html … \`\`\`.

${lookText(einstellungen.lookHinweise)}`;
}

function auftragNeu({ wunsch, breite = 1440, hoehe = 900, app = '', format }) {
  return `Neuer Entwurf.${format ? `\nFormat: ${format.name}.${format.regeln ? ` ${format.regeln}` : ''}` : ''}
Fläche: ${breite} × ${hoehe} px.${app ? `\nFür die App: ${app}.` : ''}
Wunsch von Nils: ${wunsch}`;
}

function auftragAendern({ html, wunsch, auswahl, breite, hoehe }) {
  const ziel = auswahl
    ? `Ändere nur das Element mit data-k="${auswahl.k}" (${auswahl.name || auswahl.tag}) und was direkt dazugehört. Der Rest bleibt, wie er ist.`
    : 'Ändere den Entwurf als Ganzes.';
  return `Ändere diesen Entwurf (Fläche ${breite} × ${hoehe} px).
${ziel}
Wunsch von Nils: ${wunsch}

AKTUELLES HTML:
\`\`\`html
${html}
\`\`\``;
}

function auftragVariante({ html, wunsch, richtung, breite, hoehe }) {
  const basis = html
    ? `Ausgangspunkt ist dieser Entwurf:\n\`\`\`html\n${html}\n\`\`\``
    : 'Es gibt noch keinen Entwurf, fang neu an.';
  return `Falte eine Variante in der Richtung "${richtung.name}": ${richtung.hinweis}
Fläche: ${breite} × ${hoehe} px.
Wunsch von Nils: ${wunsch || 'Mach es schöner.'}
Inhalt und Zweck bleiben gleich, nur Aufbau und Wirkung ändern sich.

${basis}`;
}

// Überträgt einen Entwurf in ein anderes Format („Alle Größen“).
function auftragAnpassen({ html, von, nach, texteAnpassen = true }) {
  return `Übertrage diesen Entwurf in ein anderes Format. Gleicher Look, gleiche Farben, gleiche Bildsprache –
aber der Aufbau wird für das neue Format neu gedacht, nicht nur skaliert.
Von: ${von.name} (${von.breite} × ${von.hoehe} px)
Nach: ${nach.name}. Ziel: ${nach.breite} × ${nach.hoehe} px.${nach.regeln ? `\nRegeln für dieses Format: ${nach.regeln}` : ''}
${texteAnpassen ? 'Texte darfst du ans Format anpassen: kürzen, wo wenig Platz ist; ergänzen (z. B. Adresse, Ablauf), wo mehr Platz ist – aber nur mit Inhalten, die schon im Entwurf stehen oder sich eindeutig daraus ergeben.' : 'Die Texte bleiben wörtlich gleich.'}

ENTWURF:
\`\`\`html
${html}
\`\`\``;
}

function auftragAusBild({ wunsch, breite = 1440, hoehe = 900 }) {
  return `Baue aus dem angehängten Bild (Screenshot oder Skizze) einen bearbeitbaren Entwurf im Look der origami-Familie.
Übernimm Aufbau, Inhalte und Texte so genau wie möglich, aber in sauberem HTML.
Fläche: ${breite} × ${hoehe} px.
${wunsch ? `Zusätzlicher Wunsch von Nils: ${wunsch}` : ''}`;
}

// Holt Notiz und HTML aus der Antwort. Wirft, wenn kein HTML drin ist.
function leseEntwurf(text) {
  const roh = String(text || '');
  const notiz = (roh.match(/^\s*NOTIZ:\s*(.+)$/im) || [])[1]?.trim() || '';
  let html = (roh.match(/```html\s*([\s\S]*?)```/i) || [])[1];
  if (!html) {
    const start = roh.search(/<!doctype html|<html[\s>]/i);
    const ende = roh.toLowerCase().lastIndexOf('</html>');
    if (start >= 0 && ende > start) html = roh.slice(start, ende + 7);
  }
  if (!html || !/<body[\s>]/i.test(html)) throw new Error('In der Antwort steckt kein Entwurf.');
  html = html.trim();
  if (!/^<!doctype/i.test(html)) html = `<!doctype html>\n${html}`;
  return { notiz, html };
}

// ---------- Bild ----------

// Feste Liste, was Kranich mit einem Bild machen darf. Alles andere wird verworfen.
const BILD_SCHRITTE = {
  zuschneiden: { x: 'prozent', y: 'prozent', b: 'prozent', h: 'prozent' },
  groesse: { breite: 'pixel', hoehe: 'pixel' },
  quadrat: { groesse: 'pixel' },
  anpassen: { hell: 'regler', kontrast: 'regler', waerme: 'regler', saett: 'regler' },
  freistellen: {},
  hintergrund: { farbe: 'farbe' },
  drehen: { grad: 'grad' },
  spiegeln: { richtung: 'richtung' },
  text: { inhalt: 'text', x: 'prozent', y: 'prozent', groesse: 'pixel', farbe: 'farbe' },
};

const SCHRITT_NAMEN = {
  zuschneiden: 'Zuschneiden', groesse: 'Größe ändern', quadrat: 'Quadratisch zuschneiden', anpassen: 'Farben anpassen',
  freistellen: 'Freistellen', hintergrund: 'Hintergrund füllen', drehen: 'Drehen', spiegeln: 'Spiegeln', text: 'Text setzen',
};

function systemBild() {
  return `Du bist Kranich, der Bildbearbeiter der origami-Familie. Du siehst das Bild von Nils und planst die Bearbeitung.
Du malst nicht selbst, sondern antwortest mit einem Plan aus festen Schritten. Erlaubte Schritte (Werte in Klammern):
- zuschneiden {x,y,b,h}: Ausschnitt in Prozent des aktuellen Bildes (0–100)
- groesse {breite,hoehe}: neue Größe in Pixeln (1–8000)
- quadrat {groesse}: mittig quadratisch zuschneiden und auf groesse × groesse Pixel bringen
- anpassen {hell,kontrast,waerme,saett}: Regler von -100 bis 100, nur die nötigen angeben
- freistellen {}: Hauptmotiv behalten, Hintergrund durchsichtig
- hintergrund {farbe}: durchsichtige Stellen mit einer Farbe (#rrggbb) füllen
- drehen {grad}: 90, 180 oder 270
- spiegeln {richtung}: "waagrecht" oder "senkrecht"
- text {inhalt,x,y,groesse,farbe}: Text setzen, Position in Prozent, groesse in Pixeln
Antworte NUR mit JSON: {"notiz": "kurzer Satz an Nils (du)", "schritte": [{"art": "…", …}]}`;
}

function auftragBild({ wunsch, breite, hoehe, auswahl }) {
  return `Bild: ${breite} × ${hoehe} px.${auswahl ? `\nAusgewählt ist der Bereich x=${auswahl.x}%, y=${auswahl.y}%, b=${auswahl.b}%, h=${auswahl.h}%.` : ''}
Wunsch von Nils: ${wunsch}`;
}

function zahl(wert, min, max) {
  const n = Number(wert);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

function pruefeWert(art, wert) {
  switch (art) {
    case 'prozent': return zahl(wert, 0, 100);
    case 'pixel': { const n = zahl(wert, 1, 8000); return n == null ? null : Math.round(n); }
    case 'regler': return wert == null ? undefined : zahl(wert, -100, 100);
    case 'grad': return [90, 180, 270].includes(Number(wert)) ? Number(wert) : null;
    case 'richtung': return wert === 'waagrecht' || wert === 'senkrecht' ? wert : null;
    case 'farbe': return /^#[0-9a-f]{6}$/i.test(String(wert)) ? String(wert).toLowerCase() : null;
    case 'text': return typeof wert === 'string' && wert.trim() ? wert.slice(0, 200) : null;
    default: return null;
  }
}

// Prüft einen Plan gegen die feste Liste. Gibt nur gültige Schritte zurück.
function pruefePlan(roh) {
  const schritte = [];
  for (const s of Array.isArray(roh) ? roh.slice(0, 12) : []) {
    const regel = BILD_SCHRITTE[s?.art];
    if (!regel) continue;
    const sauber = { art: s.art };
    let gut = true;
    for (const [feld, art] of Object.entries(regel)) {
      const wert = pruefeWert(art, s[feld]);
      if (wert === null) { gut = false; break; }
      if (wert !== undefined) sauber[feld] = wert;
    }
    if (s.art === 'zuschneiden' && gut && (sauber.b < 1 || sauber.h < 1)) gut = false;
    if (s.art === 'anpassen' && Object.keys(sauber).length === 1) gut = false;
    if (gut) schritte.push(sauber);
  }
  return schritte;
}

function lesePlan(text) {
  const roh = String(text || '');
  const block = (roh.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1] || roh;
  const start = block.indexOf('{');
  const ende = block.lastIndexOf('}');
  if (start < 0 || ende <= start) throw new Error('In der Antwort steckt kein Plan.');
  const daten = JSON.parse(block.slice(start, ende + 1));
  const schritte = pruefePlan(daten.schritte);
  if (!schritte.length) throw new Error('Kranich hat keinen machbaren Schritt gefunden.');
  return { notiz: String(daten.notiz || '').slice(0, 300), schritte };
}

function beschreibeSchritt(s) {
  switch (s.art) {
    case 'groesse': return `Größe ${s.breite} × ${s.hoehe}`;
    case 'quadrat': return `Quadrat ${s.groesse} × ${s.groesse}`;
    case 'anpassen': return ['hell', 'kontrast', 'waerme', 'saett']
      .filter((k) => s[k] != null)
      .map((k) => `${{ hell: 'Helligkeit', kontrast: 'Kontrast', waerme: 'Wärme', saett: 'Sättigung' }[k]} ${s[k] > 0 ? '+' : ''}${s[k]}`)
      .join(', ');
    case 'drehen': return `Drehen ${s.grad}°`;
    case 'text': return `Text „${s.inhalt}“`;
    default: return SCHRITT_NAMEN[s.art];
  }
}

module.exports = {
  RICHTUNGEN, systemEntwurf, auftragNeu, auftragAendern, auftragVariante, auftragAnpassen, auftragAusBild, leseEntwurf,
  BILD_SCHRITTE, systemBild, auftragBild, pruefePlan, lesePlan, beschreibeSchritt,
};
