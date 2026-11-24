'use strict';
// Baut bau/icon.svg (+ icon.png über rsvg-convert) für Albatros und Schwalbe – Kärtchen mit Eselsohr und gefaltetem Vogel.
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
global.window = {}; require('../ui/voegel-ori.js');
const V = window.VOEGEL_ORI;
const still = (svg) => svg.replace(/<animate[^>]*\/>|<animate[^>]*>\s*<\/animate>|<animateTransform[^>]*\/>|<animateTransform[^>]*>\s*<\/animateTransform>/g, '').replace(/<ellipse[^>]*><\/ellipse>/, '').replace(/ width="[^"]*" height="[^"]*"/, ' width="760" height="760"').replace('<svg ', '<svg x="120" y="150" ');
const APPS = { albatros: ['#dcf0e3', '#2f8a55', 120], schwalbe: ['#dbe6f7', '#2c5aa0', 170] };
for (const [id, [hell, farbe, x]] of Object.entries(APPS)) {
  const v = V[id].find((x) => x.name === 'ruhezustand-2');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><path d="M262 96 H700 L928 324 V762 A166 166 0 0 1 762 928 H262 A166 166 0 0 1 96 762 V262 A166 166 0 0 1 262 96Z" fill="${hell}"/><path d="M700 96 L928 324 H760 A60 60 0 0 1 700 264Z" fill="${farbe}"/>${still(v.svg).replace('x="120"', `x="${x}"`)}</svg>`;
  const ordner = path.join(__dirname, '..', id, 'bau');
  fs.writeFileSync(path.join(ordner, 'icon.svg'), svg);
  execFileSync('rsvg-convert', ['-w', '512', '-h', '512', '-o', path.join(ordner, 'icon.png'), path.join(ordner, 'icon.svg')]);
  console.log(id, 'ok');
}
