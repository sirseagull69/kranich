'use strict';
// Baut launcher/ui/voegel.js: für jeden Vogel im Startfenster die Grund-Animationen
// plus eigene, die zu seiner Aufgabe passen. Start: node werkzeug/startfenster-voegel.js
const fs = require('node:fs');
const path = require('node:path');

const GRUND = ['ruhezustand-2', 'ruhezustand-3', 'ruhezustand-4', 'winkt', 'senden', 'start-landung', 'erledigt', 'denkt-nach'];
// Was jeder Vogel zwischendurch tut – passend zu dem, was die App macht
const EIGEN = {
  origami: ['denkt-nach-2', 'wissen', 'liest', 'schreibt', 'fasst-zusammen', 'plant', 'sassy', 'gemerkt', 'websuche', 'sprache-sprechen'],
  kranich: ['bild', 'folien', 'webseite', 'schreibt', 'applaus', 'triumph', 'stellt-bereit', 'stimmt-ab'],
  albatros: ['rechnet', 'tabelle-baut', 'sortiert', 'vergleicht', 'wertet-aus', 'rechnung', 'traegt-ein', 'eingetragen'],
  specht: ['pc-check', 'sicherheit', 'terminal', 'neustart', 'backup', 'testet', 'sicher', 'prueft'],
};

global.window = {};
require('../ui/voegel-ori.js');
const ori = require('./ori-quelle.json');
const quelle = { origami: ori, ...window.VOEGEL_ORI };
const platz = (svg) => svg.replace(/(<svg[^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, '$1 width="__G__" height="__G__"');

const aus = {}; const eigen = {};
for (const [vogel, liste] of Object.entries(EIGEN)) {
  aus[vogel] = {};
  for (const name of [...GRUND, ...liste]) {
    const a = quelle[vogel].find((x) => x.name === name);
    if (!a) throw new Error(`${vogel}: ${name} fehlt`);
    aus[vogel][name] = platz(a.svg);
  }
  eigen[vogel] = liste;
}
const ziel = path.join(__dirname, '..', 'launcher', 'ui', 'voegel.js');
fs.writeFileSync(ziel, `'use strict';\n// Vogel-Animationen fürs Startfenster. Nicht von Hand ändern: werkzeug/startfenster-voegel.js\nwindow.VOEGEL=${JSON.stringify(aus)};\nwindow.VOEGEL_EIGEN=${JSON.stringify(eigen)};\n`);
console.log('geschrieben', ziel, Math.round(fs.statSync(ziel).size / 1024), 'KB');
