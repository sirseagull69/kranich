// Überträgt Oris 84 Animationen auf Kranich, Albatros und Specht (Teil für Teil, affine Abbildung)
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
// Neue Vögel nach Nils' Entwurf (Kranich-Canvas „Vogel-Alternativen“, Variante A):
// gebaut wie Ori, mit Kiel statt Beinen; Extras hängen an einem Teil und bewegen sich mit.
const VOEGEL = {
  kranich: {
    kiel: true,
    basis: { schwanz: '18,64 2,40 32,60', koerper: '18,64 70,64 52,40', fluegel: '35,51 60,52 42,6', hals: '66,64 82,16 75,62', kopf: '82,16 99,22 80,23', bein: '36,64 52,64 46,79' },
    extras: [{ nach: 'kopf', punkte: '82,16 86,14 85,19', farbe: '#e8590c' }],
    farben: { '#c2410c': '#4a2f9a', '#ff8a4c': '#7c5cd6', '#ffc9a8': '#c3b4f5', '#2d1a10': '#1d2742', '#e8590c': '#6243c4', '#fff0e6': '#f1ecfd', '#7a3a1c': '#3a2380' },
    rolleFarbe: { schwanz: '#7c5cd6', koerper: '#c3b4f5', fluegel: '#ffffff', hals: '#7c5cd6', kopf: '#1d2742', bein: '#4a2f9a' },
  },
  albatros: {
    kiel: true,
    basis: { schwanz: '16,64 6,56 30,61', koerper: '16,64 72,64 50,44', fluegel: '34,53 62,53 8,16', hals: '68,64 82,42 78,62', kopf: '82,42 92,45 81,50', bein: '36,64 52,64 46,79' },
    // dunkler Kopf, schmaler oranger Schnabel, weißes Auge (wie die Geschwister)
    extras: [{ nach: 'fluegel', punkte: '8,16 19,21 15,27', farbe: '#1b4d2d' }, { nach: 'kopf', punkte: '90,44 99,46 90,47', farbe: '#e8a23a' }, { nach: 'kopf', punkte: '84,44 86.5,44 85.5,46', farbe: '#ffffff' }],
    farben: { '#c2410c': '#1d5e3a', '#ff8a4c': '#2f8a55', '#ffc9a8': '#a8d9b5', '#2d1a10': '#1d2742', '#e8590c': '#2f8a55', '#fff0e6': '#e6f4eb', '#7a3a1c': '#14472b' },
    rolleFarbe: { schwanz: '#2f8a55', koerper: '#a8d9b5', fluegel: '#ffffff', hals: '#2f8a55', kopf: '#1d2742', bein: '#1b4d2d' },
  },
  specht: {
    // Specht, gebaut wie die Geschwister (waagrecht, weißer Flügel, Körper in hellem Hauston):
    // steifer Stützschwanz nach unten, langer gerader Schnabel, rote Kappe.
    kiel: true,
    basis: { schwanz: '18,66 7,81 31,62', koerper: '18,66 70,64 52,38', fluegel: '34,53 62,52 36,12', hals: '66,64 80,30 75,62', kopf: '80,30 99,35 80,39', bein: '36,64 52,64 46,79' },
    extras: [{ nach: 'kopf', punkte: '80,30 75,22 88,26', farbe: '#e8483a' }, { nach: 'kopf', punkte: '89,33 99,35 89,37', farbe: '#e0a63a' }],
    farben: { '#c2410c': '#8f2a1c', '#ff8a4c': '#c8372d', '#ffc9a8': '#f2b9b0', '#2d1a10': '#1d2742', '#e8590c': '#c8372d', '#fff0e6': '#fbe9e5', '#7a3a1c': '#7e2518' },
    rolleFarbe: { schwanz: '#c8372d', koerper: '#f2b9b0', fluegel: '#ffffff', hals: '#c8372d', kopf: '#1d2742', bein: '#8f2a1c' },
  },
  schwalbe: {
    // Schwalbe fürs Schreiben: Gabelschwanz, Sichelflügel mit dunkler Spitze, rostrote Kehle, kurzer Schnabel.
    kiel: true,
    basis: { schwanz: '20,62 -4,46 32,59', koerper: '20,62 70,64 50,46', fluegel: '34,54 62,53 12,14', hals: '66,64 79,42 75,62', kopf: '79,42 95,46 80,52', bein: '36,64 52,64 46,79' },
    extras: [{ nach: 'schwanz', punkte: '20,62 -2,78 30,62', farbe: '#2c5aa0' }, { nach: 'kopf', punkte: '93,44.6 99.5,46.8 93,48', farbe: '#1d2742' }, { nach: 'kopf', punkte: '83.5,44 86,44 85,46', farbe: '#ffffff' }],
    farben: { '#c2410c': '#1e3f75', '#ff8a4c': '#2c5aa0', '#ffc9a8': '#b9cdf0', '#2d1a10': '#1d2742', '#e8590c': '#2c5aa0', '#fff0e6': '#eaf0fb', '#7a3a1c': '#173360' },
    rolleFarbe: { schwanz: '#1e3f75', koerper: '#eef3fb', fluegel: '#2c5aa0', hals: '#c4502a', kopf: '#1e3f75', bein: '#1e3f75' },
  },

};
const papier = (pts) => pts.every(([x, y]) => [20, 50, 80].includes(x) && [20, 50, 80].includes(y)) || pts.every(([x, y]) => x === pts[0][0] && y === pts[0][1]);

function wandle(svg, vogel) {
  const v = VOEGEL[vogel];
  const A = {}; for (const r of Object.keys(ORI_BASIS)) A[r] = affin(P(ORI_BASIS[r]), P(v.basis[r]));
  const A2 = v.kiel ? null : affin(P(ORI_BASIS.bein), P(v.basis.bein2));
  const abb = (rolle, s) => {
    const pts = P(s);
    if (papier(pts)) return s;
    if (rolle === 'kopf') { const a = pts[0]; const a2 = A.hals.an(a); return S(pts.map((p) => { const l = A.kopf.lin([p[0] - a[0], p[1] - a[1]]); return [a2[0] + l[0], a2[1] + l[1]]; })); }
    if (rolle === 'bein' && v.kiel) return S(pts.map(A.bein.an));
    if (rolle === 'bein' || rolle === 'bein2') {
      // Kiel von Ori → Beine. Ist der Kiel eingeklappt oder liegt er quer (Flug, Papierflieger), ziehen wir die Beine ein.
      const [b1, b2, sp] = pts; const mx = (b1[0] + b2[0]) / 2, my = (b1[1] + b2[1]) / 2;
      const h = sp[1] - my, dx = sp[0] - mx;
      const M = rolle === 'bein2' ? A2 : A.bein;
      const neu = pts.map(M.an);
      if (h < 6 || Math.abs(dx) > h * 1.1) { const oben = [(neu[0][0] + neu[1][0]) / 2, (neu[0][1] + neu[1][1]) / 2]; return S([neu[0], neu[1], oben]); }
      return S(neu);
    }
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
    const extras = (v.extras || []).filter((e) => e.nach === r && !(r === 'kopf' && liste.slice(0, i).some((y, j) => j >= startIdx && rollen[j - startIdx] === 'kopf')));
    const extraPoly = (e) => {
      const basisT = P(v.basis[e.nach]); const ep = P(e.punkte);
      const folge = (wert) => {
        const ziel = P(abb(r, wert));
        const det = (ziel[1][0] - ziel[0][0]) * (ziel[2][1] - ziel[0][1]) - (ziel[2][0] - ziel[0][0]) * (ziel[1][1] - ziel[0][1]);
        if (Math.abs(det) < 0.5 || papier(P(wert))) return S([ziel[0], ziel[0], ziel[0]]);
        const M = affin(basisT, ziel); return S(ep.map(M.an));
      };
      const innen = x.innen.replace(/attributeName="points" values="([^"]*)"/g, (_, vals) => `attributeName="points" values="${vals.split(';').map(folge).join(';')}"`).replace(/<animate attributeName="(fill|opacity)"[^>]*>(<\/animate>)?/g, '');
      return `<polygon points="${folge(x.punkte)}" fill="${e.farbe}">${innen}</polygon>`;
    };
    aus += (r === 'bein' && !v.kiel ? neu('bein2') + neu('bein') : neu(r)) + extras.map(extraPoly).join('');
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
