// Überträgt Oris 84 Animationen auf Kranich und Albatros (Teil für Teil, affine Abbildung)
const fs = require('fs');
const ORI = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'ori-quelle.json'), 'utf8'));
const P = (s) => s.trim().split(/\s+/).map((p) => p.split(',').map(Number));
const S = (pts) => pts.map(([x, y]) => `${+x.toFixed(1)},${+y.toFixed(1)}`).join(' ');
function affin(src, dst) {
  // löse [x' y'] = [a b c; d e f] [x y 1]
  const [[x1, y1], [x2, y2], [x3, y3]] = src;
  const det = x1 * (y2 - y3) - y1 * (x2 - x3) + (x2 * y3 - x3 * y2);
  const inv = [
    [(y2 - y3) / det, (y3 - y1) / det, (y1 - y2) / det],
    [(x3 - x2) / det, (x1 - x3) / det, (x2 - x1) / det],
    [(x2 * y3 - x3 * y2) / det, (x3 * y1 - x1 * y3) / det, (x1 * y2 - x2 * y1) / det],
  ];
  const loes = (v) => [0, 1, 2].map((r) => inv[r][0] * v[0] + inv[r][1] * v[1] + inv[r][2] * v[2]);
  const [a, b, c] = loes(dst.map((p) => p[0]));
  const [d, e, f] = loes(dst.map((p) => p[1]));
  return { m: [a, b, c, d, e, f], an: ([x, y]) => [a * x + b * y + c, d * x + e * y + f], lin: ([x, y]) => [a * x + b * y, d * x + e * y] };
}
const ORI_BASIS = { schwanz: '18,64 8,50 32,60', koerper: '18,64 70,64 52,40', fluegel: '36,51 61,52 40,12', hals: '70,64 86,40 78,62', kopf: '86,40 96,45 84,47', bein: '36,64 52,64 46,78' };
const VOEGEL = {
  kranich: {
    basis: { schwanz: '24,58 10,48 32,54', koerper: '24,58 62,58 46,38', fluegel: '30,52 56,55 39,27', hals: '56,56 71,41 62,58', kopf: '71,41 84,48 69,47', bein: '40,58 43,58 41,86', bein2: '48,58 51,58 52,86' },
    farben: { '#c2410c': '#4a2f9a', '#ff8a4c': '#7c5cd6', '#ffc9a8': '#d6caf9', '#2d1a10': '#1d2742', '#e8590c': '#6243c4', '#fff0e6': '#f1ecfd', '#7a3a1c': '#3a2380' },
    rolleFarbe: {},
  },
  albatros: {
    basis: { schwanz: '16,66 2,58 28,62', koerper: '16,66 70,66 50,44', fluegel: '28,58 62,58 8,38', hals: '60,62 78,42 72,66', kopf: '78,42 95,48 78,52', bein: '40,66 44,66 42,84', bein2: '50,66 54,66 55,84' },
    farben: { '#c2410c': '#1d5e3a', '#ff8a4c': '#2f8a55', '#ffc9a8': '#a8dcbb', '#2d1a10': '#1d2742', '#e8590c': '#2f8a55', '#fff0e6': '#e6f4eb', '#7a3a1c': '#14472b' },
    rolleFarbe: { schwanz: '#1d5e3a', koerper: '#2f8a55', fluegel: '#a8dcbb', hals: '#f3faf5', kopf: '#e8a53a', bein: '#1d5e3a' },
  },
};
const papier = (pts) => pts.every(([x, y]) => [20, 50, 80].includes(x) && [20, 50, 80].includes(y)) || pts.every(([x, y]) => x === pts[0][0] && y === pts[0][1]);

function wandle(svg, vogel) {
  const v = VOEGEL[vogel];
  const A = {}; for (const r of Object.keys(ORI_BASIS)) A[r] = affin(P(ORI_BASIS[r]), P(v.basis[r]));
  const A2 = affin(P(ORI_BASIS.bein), P(v.basis.bein2));
  const abb = (rolle, s) => {
    const pts = P(s);
    if (papier(pts)) return s;
    if (rolle === 'kopf') { const a = pts[0]; const a2 = A.hals.an(a); return S(pts.map((p) => { const l = A.kopf.lin([p[0] - a[0], p[1] - a[1]]); return [a2[0] + l[0], a2[1] + l[1]]; })); }
    if (rolle === 'bein2') return S(pts.map(A2.an));
    return S(pts.map(A[rolle].an));
  };
  // Vogel-Polygone finden: Folge tail, body, wing, neck, head+, leg
  const polys = [...svg.matchAll(/<polygon points="([^"]*)" fill="([^"]*)">?(.*?)<\/polygon>|<polygon points="([^"]*)" fill="([^"]*)"><\/polygon>/gs)];
  const re = /<polygon points="([^"]*)" fill="([^"]*)">(.*?)<\/polygon>/gs;
  const liste = []; let m; while ((m = re.exec(svg))) liste.push({ start: m.index, ende: m.index + m[0].length, punkte: m[1], farbe: m[2], innen: m[3] });
  const f = liste.map((x) => x.farbe).join(',');
  const muster = /#c2410c,#ff8a4c,#ffc9a8,#c2410c,(#2d1a10,)+#e8590c/.exec(f);
  const startIdx = f.slice(0, muster.index).split(',').filter(Boolean).length;
  const anzahlKopf = (muster[0].match(/#2d1a10/g) || []).length;
  const rollen = ['schwanz', 'koerper', 'fluegel', 'hals', ...Array(anzahlKopf).fill('kopf'), 'bein'];
  let aus = ''; let pos = 0;
  liste.forEach((x, i) => {
    const r = i >= startIdx && i < startIdx + rollen.length ? rollen[i - startIdx] : null;
    aus += svg.slice(pos, x.start);
    if (!r) { aus += svg.slice(x.start, x.ende); pos = x.ende; return; }
    const neu = (rolle) => {
      const innen = x.innen.replace(/attributeName="points" values="([^"]*)"/g, (_, vals) => `attributeName="points" values="${vals.split(';').map((s) => abb(rolle, s)).join(';')}"`);
      const farbe = v.rolleFarbe[rolle === 'bein2' ? 'bein' : rolle] || v.farben[x.farbe] || x.farbe;
      return `<polygon points="${abb(rolle, x.punkte)}" fill="${farbe}">${innen}</polygon>`;
    };
    aus += r === 'bein' ? neu('bein2') + neu('bein') : neu(r);
    pos = x.ende;
  });
  aus += svg.slice(pos);
  // restliche Farben umfärben
  return aus.replace(/#[0-9a-fA-F]{6}\b/g, (c) => v.farben[c.toLowerCase()] || c).replace(/\s*style="[^"]*"/, ' style="display:block;flex:none;overflow:visible"').replace(/ width="92" height="92"/, ' width="__G__" height="__G__"');
}
const daten = {};
for (const vogel of Object.keys(VOEGEL)) daten[vogel] = ORI.map((a) => ({ name: a.name, info: a.info, art: a.art, svg: wandle(a.svg, vogel) }));
fs.writeFileSync(require('path').join(__dirname, '..', 'ui', 'voegel-ori.js'), `'use strict';\n// Erzeugt aus Oris 84 Animationen (origami), übertragen auf Kranich und Albatros. Nicht von Hand ändern: werkzeug/voegel-wandeln.js\nwindow.VOEGEL_ORI = ${JSON.stringify(daten)};\n`);
console.log('ok', (fs.statSync(require('path').join(__dirname, '..', 'ui', 'voegel-ori.js')).size / 1024).toFixed(0), 'KB');
