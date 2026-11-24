'use strict';
// Baut schwalbe/ui/voegel.js aus den übertragenen Ori-Animationen. Start: node werkzeug/schwalbe-voegel.js
const fs = require('node:fs');
const path = require('node:path');
global.window = {};
require('../ui/voegel-ori.js');
const NAMEN = ['ruhezustand-2', 'ruhezustand-3', 'ruhezustand-4', 'winkt', 'denkt-nach', 'erledigt', 'schreibt', 'liest', 'fasst-zusammen', 'senden', 'start-landung', 'gemerkt'];
const platz = (svg) => svg.replace(/(<svg[^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, '$1 width="__G__" height="__G__"');
const aus = {};
for (const n of NAMEN) { const a = window.VOEGEL_ORI.schwalbe.find((x) => x.name === n); if (!a) throw new Error(`${n} fehlt`); aus[n] = platz(a.svg); }
const ziel = path.join(__dirname, '..', 'schwalbe', 'ui', 'voegel.js');
fs.writeFileSync(ziel, `'use strict';\n// Schwalben-Animationen. Nicht von Hand ändern: werkzeug/schwalbe-voegel.js\nwindow.VOGEL=${JSON.stringify(aus)};\n`);
console.log('geschrieben', Math.round(fs.statSync(ziel).size / 1024), 'KB');
