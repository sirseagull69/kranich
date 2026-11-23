'use strict';
// Baut das Icon der Sammlung „Selbst gfaltet“ (nach Nils' Entwurf aus Kranich):
// Papierkärtchen mit drei Kreisen und den Vögeln origami, Kranich, Albatros.
// Klein (≤ 32 px): drei gefaltete Spitzen. Ausgabe: PNGs + icon.ico für das Startfenster.
// Start: npx electron werkzeug/familien-icon.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
global.window = {}; require('../launcher/ui/voegel.js');
const V = global.window.VOEGEL;
const still = (svg, x, y, g) => svg.replace(/<animate[^>]*\/>|<animate[^>]*>\s*<\/animate>|<animateTransform[^>]*\/>|<animateTransform[^>]*>\s*<\/animateTransform>/g, '').replace(/__G__/g, g).replace('<svg ', `<svg x="${x}" y="${y}" `);

function gross() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf4e6"/><stop offset="1" stop-color="#f3e5c6"/></linearGradient>
  <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="26" flood-color="#3a2a10" flood-opacity=".22"/></filter>
  <clipPath id="k"><path d="M262 96 H700 L928 324 V762 A166 166 0 0 1 762 928 H262 A166 166 0 0 1 96 762 V262 A166 166 0 0 1 262 96Z"/></clipPath></defs>
  <g filter="url(#s)"><path d="M262 96 H700 L928 324 V762 A166 166 0 0 1 762 928 H262 A166 166 0 0 1 96 762 V262 A166 166 0 0 1 262 96Z" fill="url(#p)"/></g>
  <g clip-path="url(#k)">
    <rect x="150" y="150" width="724" height="724" rx="120" fill="none" stroke="#fff" stroke-width="12" stroke-dasharray="44 30" opacity=".85"/>
    <circle cx="372" cy="606" r="182" fill="#ffd3b8" opacity=".9"/>
    <circle cx="520" cy="452" r="186" fill="#ddd0fb" opacity=".9"/>
    <circle cx="676" cy="604" r="182" fill="#c9ecd6" opacity=".9"/>
    <ellipse cx="512" cy="818" rx="300" ry="26" fill="#3a2a10" opacity=".08"/>
    ${still(V.kranich['ruhezustand-3'], 342, 300, 380)}
    ${still(V.origami['ruhezustand-3'], 180, 460, 330)}
    ${still(V.albatros['ruhezustand-3'], 540, 470, 340)}
  </g>
  <path d="M700 96 L928 324 H760 A60 60 0 0 1 700 264Z" fill="#e7d4ab"/>
</svg>`;
}
function klein() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect x="3" y="3" width="58" height="58" rx="13" fill="#f8eedb"/>
  <path d="M46 3 H48 L61 16 V18 H50 A4 4 0 0 1 46 14Z" fill="#e2cf9f"/>
  <path d="M8 52 L22 22 L34 52Z" fill="#ff8a4c"/><path d="M22 22 L28 52 L34 52Z" fill="#c2410c"/>
  <path d="M22 52 L34 14 L46 52Z" fill="#7c5cd6"/><path d="M34 14 L40 52 L46 52Z" fill="#4a2f9a"/>
  <path d="M34 52 L45 28 L57 52Z" fill="#2f8a55"/><path d="M45 28 L50 52 L57 52Z" fill="#1d5e3a"/>
</svg>`;
}
function ico(bilder) { // [{groesse, png}]
  const kopf = Buffer.alloc(6); kopf.writeUInt16LE(0, 0); kopf.writeUInt16LE(1, 2); kopf.writeUInt16LE(bilder.length, 4);
  let ort = 6 + 16 * bilder.length; const eintraege = [];
  for (const b of bilder) { const e = Buffer.alloc(16); e.writeUInt8(b.groesse >= 256 ? 0 : b.groesse, 0); e.writeUInt8(b.groesse >= 256 ? 0 : b.groesse, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(b.png.length, 8); e.writeUInt32LE(ort, 12); ort += b.png.length; eintraege.push(e); }
  return Buffer.concat([kopf, ...eintraege, ...bilder.map((b) => b.png)]);
}
app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false, width: 1024, height: 1024, frame: false, transparent: true, webPreferences: { offscreen: true } });
  const foto = async (svg, g) => {
    const html = `<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" style="width:${g}px;height:${g}px;display:block"></body></html>`;
    w.setContentSize(g, g); await w.loadURL(`data:text/html;base64,${Buffer.from(html).toString('base64')}`); await new Promise((r) => setTimeout(r, 300));
    return (await w.webContents.capturePage({ x: 0, y: 0, width: g, height: g })).resize({ width: g, height: g }).toPNG();
  };
  const ziel = path.join(__dirname, '..', 'launcher', 'bau');
  fs.writeFileSync(path.join(ziel, 'icon.png'), await foto(gross(), 1024));
  fs.writeFileSync(path.join(__dirname, '..', 'launcher', 'ui', 'marke.svg'), klein());
  fs.writeFileSync(path.join(__dirname, '..', 'launcher', 'ui', 'icon-gross.svg'), gross());
  const teile = [];
  for (const g of [16, 24, 32]) teile.push({ groesse: g, png: await foto(klein(), g) });
  for (const g of [48, 64, 128, 256]) teile.push({ groesse: g, png: await foto(gross(), g) });
  fs.writeFileSync(path.join(ziel, 'icon.ico'), ico(teile));
  fs.writeFileSync('/tmp/icon-uebersicht.html', `<body style="background:#1d2742;display:flex;gap:20px;align-items:end;padding:20px">${[256, 128, 64, 48, 32, 16].map((g) => `<img src="data:image/png;base64,${(teile.find((t) => t.groesse === g)?.png || teile.find((t) => t.groesse === 256).png).toString('base64')}" width="${g}">`).join('')}<div style="background:#f4f0e8;padding:20px;display:flex;gap:20px;align-items:end">${[64, 32, 16].map((g) => `<img src="data:image/png;base64,${teile.find((t) => t.groesse === g).png.toString('base64')}" width="${g}">`).join('')}</div></body>`);
  console.log('Icon fertig');
  app.quit();
});
