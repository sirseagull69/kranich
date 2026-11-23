// Baut bau/icon.png (512px) aus dem Specht-SVG – mit Electron gerendert.
const { app, BrowserWindow } = require('electron');
const fs = require('fs'); const path = require('path');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="#f8e2dc"/><rect x="47" y="8" width="5" height="50" rx="1.5" fill="#e3ddcf"/><polygon points="20,50 28,26 38,22 44,40 34,52" fill="#1d2742"/><polygon points="28,26 38,22 34,34" fill="#2c3a5e"/><polygon points="34,34 38,22 44,40" fill="#3a4a72"/><polygon points="36,36 44,40 40,46" fill="#fffdf9"/><polygon points="20,50 14,58 24,54" fill="#1d2742"/><polygon points="30,18 40,14 42,24 34,26" fill="#fffdf9"/><polygon points="30,18 36,11 42,15 40,14" fill="#b23a28"/><polygon points="36,11 44,12 42,17" fill="#8f2a1c"/><polygon points="42,19 50,21 42,23" fill="#e8b04a"/><circle cx="38" cy="19" r="1.6" fill="#1d2742"/></svg>`;
app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false, width: 512, height: 512, frame: false, transparent: true, webPreferences: { offscreen: true } });
  await w.loadURL('data:text/html,' + encodeURIComponent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`));
  await new Promise((r) => setTimeout(r, 300));
  const bild = await w.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  fs.writeFileSync(path.join(__dirname, '..', 'bau', 'icon.png'), bild.toPNG());
  app.exit(0);
});
