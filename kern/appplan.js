'use strict';
// „Ganze App entwerfen“: Plan, Bausteine und die Aufträge für jedes Board.
// Reine Textarbeit, ohne Netz testbar.

const { lookText } = require('./familie');
const { format: formatVon } = require('./formate');

const ZUSTAENDE = { leer: 'Leer (noch keine Inhalte)', laedt: 'Lädt', fehler: 'Fehler', fertig: 'Erfolg / fertig' };
const MAX_BILDSCHIRME = 12;
const MAX_BOARDS = 30;

function slug(text) {
  return String(text || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'bildschirm';
}

function systemPlan(einstellungen = {}) {
  return `Du bist Kranich, die Entwurfsmaschine der origami-Familie, hier als Produktdesigner.
Du planst die Bildschirme einer App, bevor sie gestaltet werden.

Antworte NUR mit JSON in genau dieser Form:
{
  "name": "Name der App",
  "notiz": "ein Satz an Nils (du), was du geplant hast",
  "bildschirme": [
    { "name": "Startfenster", "format": "fenster", "zweck": "ein Satz, was man hier tut", "zustaende": ["leer"] }
  ],
  "ablaeufe": [
    { "von": "Startfenster", "knopf": "Neues Dokument", "nach": "Dokument" }
  ],
  "bausteine": { "hausfarbe": "#rrggbb", "facette": "#rrggbb", "hell": "#rrggbb", "hinweis": "ein Satz zur Wirkung" }
}

Regeln:
- Höchstens ${MAX_BILDSCHIRME} Bildschirme, nur die wirklich nötigen. Namen kurz und deutsch, jeder Name nur einmal.
- format ist eines von: fenster (Desktop-App 1200×800), web (1440×900), app (Handy 390×844), tablet (1024×768).
- zustaende nur, wenn der Bildschirm sie wirklich hat; erlaubt: ${Object.keys(ZUSTAENDE).join(', ')}.
- ablaeufe verbinden Bildschirme über einen sichtbaren Knopf oder Link; "von" und "nach" sind Namen aus bildschirme.
- Bausteine: Hausfarbe der App aus der Familie übernehmen, wenn die App dort steht.

${lookText(einstellungen.lookHinweise)}`;
}

function auftragPlan({ beschreibung, geraet = 'desktop', zustaende = true }) {
  const g = { desktop: 'Desktop (format fenster oder web)', handy: 'Handy (format app)', beides: 'Desktop und Handy (beide Formate, gleiche Bildschirme)' }[geraet] || geraet;
  return `Plane diese App.
Beschreibung von Nils: ${beschreibung}
Gerät: ${g}
${zustaende ? 'Plane die wichtigen Zustände mit (leer, lädt, Fehler), wo es sie gibt.' : 'Keine Zustände, nur die normalen Bildschirme.'}`;
}

function jsonAus(text) {
  const roh = String(text || '');
  const block = (roh.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1] || roh;
  const start = block.indexOf('{');
  const ende = block.lastIndexOf('}');
  if (start < 0 || ende <= start) throw new Error('In der Antwort steckt kein Plan.');
  return JSON.parse(block.slice(start, ende + 1));
}

const farbe = (f, ersatz) => (/^#[0-9a-f]{6}$/i.test(String(f)) ? String(f).toLowerCase() : ersatz);

// Prüft und säubert einen Plan. Wirft, wenn nichts Brauchbares drin ist.
function lesePlanApp(text, { geraet = 'desktop' } = {}) {
  const d = jsonAus(text);
  const erlaubt = ['fenster', 'web', 'app', 'tablet'];
  const gesehen = new Set();
  const bildschirme = [];
  for (const b of Array.isArray(d.bildschirme) ? d.bildschirme : []) {
    const name = String(b?.name || '').trim().slice(0, 40);
    if (!name || gesehen.has(name.toLowerCase())) continue;
    gesehen.add(name.toLowerCase());
    const fmt = erlaubt.includes(b.format) ? b.format : geraet === 'handy' ? 'app' : 'fenster';
    const z = [...new Set((Array.isArray(b.zustaende) ? b.zustaende : []).filter((x) => x in ZUSTAENDE))];
    let id = slug(name);
    while (bildschirme.some((x) => x.id === id)) id += '-2';
    bildschirme.push({ id, name, format: fmt, zweck: String(b.zweck || '').slice(0, 200), zustaende: z });
    if (bildschirme.length >= MAX_BILDSCHIRME) break;
  }
  if (!bildschirme.length) throw new Error('Der Plan enthält keine Bildschirme.');
  const nachName = (n) => bildschirme.find((b) => b.name.toLowerCase() === String(n || '').trim().toLowerCase());
  const ablaeufe = [];
  for (const a of Array.isArray(d.ablaeufe) ? d.ablaeufe : []) {
    const von = nachName(a?.von), nach = nachName(a?.nach);
    const knopf = String(a?.knopf || '').trim().slice(0, 40);
    if (von && nach && von !== nach && knopf) ablaeufe.push({ von: von.id, nach: nach.id, knopf });
  }
  const bs = d.bausteine || {};
  return {
    name: String(d.name || 'Neue App').slice(0, 60),
    notiz: String(d.notiz || '').slice(0, 300),
    bildschirme,
    ablaeufe,
    bausteine: { hausfarbe: farbe(bs.hausfarbe, '#7c5cd6'), facette: farbe(bs.facette, '#4a2f9a'), hell: farbe(bs.hell, '#d6caf9'), hinweis: String(bs.hinweis || '').slice(0, 200) },
  };
}

// Aus dem Plan die Boards: pro Bildschirm eins, dazu eins pro Zustand.
function boardsAusPlan(plan) {
  const liste = [];
  for (const b of plan.bildschirme) {
    const f = formatVon(b.format);
    liste.push({ id: b.id, bildschirm: b.id, name: b.name, format: f.id, breite: f.breite, hoehe: f.hoehe, zustand: null });
    for (const z of b.zustaende) {
      liste.push({ id: `${b.id}--${z}`, bildschirm: b.id, name: `${b.name} · ${ZUSTAENDE[z].split(' ')[0]}`, format: f.id, breite: f.breite, hoehe: f.hoehe, zustand: z });
    }
  }
  return liste.slice(0, MAX_BOARDS);
}

// Lage auf der Leinwand: jeder Bildschirm eine Reihe, Zustände daneben.
function legeBoards(boards, { abstand = 120, reihenAbstand = 220 } = {}) {
  let y = 0;
  const reihen = new Map();
  for (const b of boards) {
    if (!reihen.has(b.bildschirm)) reihen.set(b.bildschirm, []);
    reihen.get(b.bildschirm).push(b);
  }
  for (const reihe of reihen.values()) {
    let x = 0;
    for (const b of reihe) { b.x = x; b.y = y; x += b.breite + abstand; }
    y += Math.max(...reihe.map((b) => b.hoehe)) + reihenAbstand;
  }
  return boards;
}

function systemBausteine(einstellungen = {}) {
  return `Du bist Kranich, die Entwurfsmaschine der origami-Familie. Du legst die gemeinsamen Bausteine einer App fest,
die danach jeder Bildschirm benutzt.

ANTWORT
Zuerst "NOTIZ: …" (ein Satz an Nils).
Dann EIN Block \`\`\`css … \`\`\` mit den gemeinsamen Stilen:
- :root mit Variablen (--k-grund, --k-flaeche, --k-tinte, --k-leise, --k-linie, --k-haus, --k-facette, --k-hell, --k-radius, --k-abstand) und den Schriften.
- Klassen, die jeder Bildschirm nutzt: .k-kopf (Kopfzeile), .k-knopf und .k-knopf-haupt, .k-feld (Eingabe), .k-karte, .k-liste und .k-zeile, .k-chip, .k-seitenleiste, .k-titel, .k-text, .k-leise.
- Kein html/body-Selektor mit Größen, keine Schriftdateien außer Google Fonts per @import.
Dann EIN Block \`\`\`html … \`\`\`: ein Übersichts-Board (1200 × 800), das alle Bausteine zeigt (Farben, Schriftproben, Knöpfe, Feld, Karte, Kopfzeile, Liste, Chips), mit genau diesem CSS im <style>.

${lookText(einstellungen.lookHinweise)}`;
}

function auftragBausteine(plan) {
  return `App: ${plan.name}
Hausfarbe ${plan.bausteine.hausfarbe}, Facette ${plan.bausteine.facette}, hell ${plan.bausteine.hell}. ${plan.bausteine.hinweis}
Bildschirme: ${plan.bildschirme.map((b) => b.name).join(', ')}.`;
}

function leseBausteine(text) {
  const roh = String(text || '');
  const css = (roh.match(/```css\s*([\s\S]*?)```/i) || [])[1];
  if (!css || !/--k-haus/.test(css)) throw new Error('In der Antwort stecken keine Bausteine.');
  const notiz = (roh.match(/^\s*NOTIZ:\s*(.+)$/im) || [])[1]?.trim() || '';
  let html = (roh.match(/```html\s*([\s\S]*?)```/i) || [])[1] || '';
  if (html && !/^<!doctype/i.test(html.trim())) html = `<!doctype html>\n${html.trim()}`;
  return { notiz, css: css.trim(), html: html.trim() };
}

function auftragAppBoard({ plan, board, css }) {
  const b = plan.bildschirme.find((x) => x.id === board.bildschirm);
  const raus = plan.ablaeufe.filter((a) => a.von === board.bildschirm);
  const andere = plan.bildschirme.filter((x) => x.id !== b.id).map((x) => x.name).join(', ');
  return `Gestalte einen Bildschirm der App „${plan.name}“.
Bildschirm: ${b.name}. Zweck: ${b.zweck}
Fläche: ${board.breite} × ${board.hoehe} px.
${board.zustand ? `Zeige den Zustand „${ZUSTAENDE[board.zustand]}“ dieses Bildschirms (gleicher Aufbau wie der normale Bildschirm, nur der Inhaltsbereich zeigt den Zustand).` : 'Zeige den normalen Zustand mit glaubwürdigen Inhalten.'}
Andere Bildschirme der App (für Navigation und Menüs): ${andere || 'keine'}.
${raus.length ? `Diese Knöpfe oder Links MÜSSEN sichtbar sein und data-ziel tragen:\n${raus.map((a) => `- „${a.knopf}“ → data-ziel="${a.nach}"`).join('\n')}` : ''}

GEMEINSAME BAUSTEINE – füge genau diesen Block unverändert als <style data-bausteine> in den <head> ein und benutze seine Klassen und Variablen statt eigener Farben:
\`\`\`css
${css}
\`\`\``;
}

module.exports = {
  ZUSTAENDE, MAX_BILDSCHIRME, systemPlan, auftragPlan, lesePlanApp, boardsAusPlan, legeBoards,
  systemBausteine, auftragBausteine, leseBausteine, auftragAppBoard, slug,
};
