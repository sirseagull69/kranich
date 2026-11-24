'use strict';
// Baut bau/icon.svg + icon.png (und .ico fürs Startfenster) für alle Apps von Ori Office im gleichen Design:
// Kärtchen in der hellen App-Farbe, Eselsohr oben rechts in der Hauptfarbe, gefalteter Vogel gleich groß in der Mitte.
// Aufruf: node werkzeug/app-icons.js
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
global.window = {}; require('../ui/voegel-ori.js'); require('../origami/ui/ori.js');
const V = window.VOEGEL_ORI; const ORI = window.ORI;
const still = (svg) => svg
  .replace(/<animate[^>]*\/>|<animate[^>]*>\s*<\/animate>|<animateTransform[^>]*\/>|<animateTransform[^>]*>\s*<\/animateTransform>/g, '')
  .replace(/<ellipse[^>]*>(<\/ellipse>)?/g, '')
  .replace(/ style="[^"]*"/, '').replace(/ aria-hidden="true"/, '');
const platziere = (svg, x, y, g) => still(svg).replace(/ width="[^"]*" height="[^"]*"/, ` width="${g}" height="${g}"`).replace('<svg ', `<svg x="${x}" y="${y}" `);
const KARTE = 'M262 96 H758 L928 266 V762 A166 166 0 0 1 762 928 H262 A166 166 0 0 1 96 762 V262 A166 166 0 0 1 262 96Z';
const OHR = 'M758 96 L928 266 H806 A48 48 0 0 1 758 218Z';
const karte = (hell, farbe, innen) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><path d="${KARTE}" fill="${hell}"/><path d="${OHR}" fill="${farbe}"/>${innen}</svg>`;
const vogel = (id) => (V[id].find((x) => x.name === 'ruhezustand-2') || V[id][0]).svg;

// [ordner, hell, farbe, svg-Quelle, x, y, größe]
const APPS = [
  ['.', '#ece6fd', '#7c5cd6', vogel('kranich'), 120, 230, 600],
  ['albatros', '#dcf0e3', '#2f8a55', vogel('albatros'), 132, 150, 760],
  ['schwalbe', '#dbe6f7', '#2c5aa0', vogel('schwalbe'), 150, 150, 740],
  ['specht', '#f8e2dc', '#b23a28', vogel('specht'), 150, 150, 720],
  ['origami', '#ffeadb', '#e8743b', ORI['ruhezustand-3'] || ORI['ruhezustand-2'], 150, 150, 720],
];
// Lagen aus werkzeug/icon-lagen.json (vom Prüfer werkzeug/icon-pruefen.py ermittelt) haben Vorrang
let LAGEN = {}; try { LAGEN = JSON.parse(fs.readFileSync(path.join(__dirname, 'icon-lagen.json'), 'utf8')); } catch { /* keine */ }
const NUR_VOGEL = process.env.NUR_VOGEL === '1';
for (const [ordner, hell, farbe, quelle, x0, y0, g0] of APPS) {
  const [x, y, g] = LAGEN[ordner] || [x0, y0, g0];
  const svg = NUR_VOGEL ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${platziere(quelle, x, y, g)}</svg>` : karte(hell, farbe, platziere(quelle, x, y, g));
  if (NUR_VOGEL) { const n = ordner === '.' ? 'kranich' : ordner; fs.writeFileSync(`/tmp/vogel-${n}.svg`, svg); execFileSync('rsvg-convert', ['-w', '1024', '-h', '1024', '-o', `/tmp/vogel-${n}.png`, `/tmp/vogel-${n}.svg`]); continue; }
  const bau = path.join(__dirname, '..', ordner, 'bau');
  fs.writeFileSync(path.join(bau, 'icon.svg'), svg);
  execFileSync('rsvg-convert', ['-w', '512', '-h', '512', '-o', path.join(bau, 'icon.png'), path.join(bau, 'icon.svg')]);
  console.log(ordner, 'ok');
}

// Startfenster: cremefarbene Karte, Eselsohr in Tinte, darauf die vier Apps als kleine Kacheln (wie ein App-Ordner)
const KACHEL = 250; const LUECKE = 30; const X0 = 247; const Y0 = 318;
const KREIS = [['kranich', '#ece6fd', '#7c5cd6', 0, 0], ['albatros', '#dcf0e3', '#2f8a55', 1, 0], ['schwalbe', '#dbe6f7', '#2c5aa0', 0, 1], ['specht', '#f8e2dc', '#b23a28', 1, 1]];
const [fx, fy, fs2] = LAGEN.startfenster || [0, 0, 1];
const familie = KREIS.map(([id, hell, farbe, sp, ze]) => { const x = X0 + sp * (KACHEL + LUECKE); const y = Y0 + ze * (KACHEL + LUECKE); return `<rect x="${x}" y="${y}" width="${KACHEL}" height="${KACHEL}" rx="62" fill="${hell}"/><path d="M${x + KACHEL - 70} ${y} H${x + KACHEL - 62} A62 62 0 0 1 ${x + KACHEL} ${y + 62} V${y + 70} Z" fill="${farbe}"/>${platziere(vogel(id), x + 22, y + 26, KACHEL - 44)}`; }).join('');
const famGruppe = `<g transform="translate(${fx} ${fy}) scale(${fs2})">${familie}</g>`;
if (NUR_VOGEL) { fs.writeFileSync('/tmp/vogel-startfenster.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${famGruppe}</svg>`); execFileSync('rsvg-convert', ['-w', '1024', '-h', '1024', '-o', '/tmp/vogel-startfenster.png', '/tmp/vogel-startfenster.svg']); process.exit(0); }
const start = karte('#fbf3e4', '#1d2742', famGruppe);
const lb = path.join(__dirname, '..', 'launcher', 'bau');
fs.writeFileSync(path.join(lb, 'icon.svg'), start);
execFileSync('rsvg-convert', ['-w', '512', '-h', '512', '-o', path.join(lb, 'icon.png'), path.join(lb, 'icon.svg')]);
console.log('startfenster ok');
