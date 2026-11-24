'use strict';
// Legt in jeder App ui/ori.js an: ein paar echte Ori-Animationen (aus origami),
// damit Ori überall gleich aussieht. Start: node werkzeug/ori-fuer-apps.js
const fs = require('node:fs');
const path = require('node:path');
const ori = require('./ori-quelle.json');
const NAMEN = ['ruhezustand-2', 'ruhezustand-3', 'denkt-nach', 'sassy', 'winkt', 'erledigt'];
const platz = (svg) => svg.replace(/(<svg[^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, '$1 width="__G__" height="__G__"');
const aus = {};
for (const n of NAMEN) { const a = ori.find((x) => x.name === n); if (!a) throw new Error(`${n} fehlt`); aus[n] = platz(a.svg); }
for (const app of ['albatros', 'specht', '.']) {
  const ziel = path.join(__dirname, '..', app, 'ui', 'ori.js');
  if (!fs.existsSync(path.dirname(ziel))) continue;
  fs.writeFileSync(ziel, `'use strict';\n// Ori-Animationen für den gemeinsamen Ori-Office-Rahmen. Nicht von Hand ändern: werkzeug/ori-fuer-apps.js\nwindow.ORI=${JSON.stringify(aus)};\n`);
  console.log('geschrieben', ziel);
}
