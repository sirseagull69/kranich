// Rauchtest: startet die echte App, ruft die Bruecke aus dem Fenster auf,
// macht ein Bild und beendet sich. Aufruf: electron test/rauch.js
const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow } = require('electron');
app.setPath('userData', path.join(require('node:os').tmpdir(), 'kranich-rauch-' + process.pid));
require('../main/main.js');
app.whenReady().then(() => setTimeout(async () => {
  const f = BrowserWindow.getAllWindows()[0];
  const aus = {};
  try {
    aus.titel = f.getTitle();
    aus.api = await f.webContents.executeJavaScript('Object.keys(window.kranich).sort()');
    aus.node = await f.webContents.executeJavaScript('typeof require + "/" + typeof process');
    aus.lage = await f.webContents.executeJavaScript('window.kranich.lage()');
    aus.einstellungen = await f.webContents.executeJavaScript('window.kranich.einstellungenLesen()');
    aus.schluessel = await f.webContents.executeJavaScript('window.kranich.vtSchluesselSetzen("' + 'b'.repeat(64) + '")');
    aus.wache = await f.webContents.executeJavaScript('window.kranich.wacheStatus()');
    aus.autostart = await f.webContents.executeJavaScript('window.kranich.autostart()');
    aus.unerlaubt = await f.webContents.executeJavaScript('window.kranich.beende === undefined');
    await f.webContents.executeJavaScript('document.getElementById("lage").click()');
    await new Promise((r) => setTimeout(r, 500));
    fs.writeFileSync(process.env.BILD, (await f.webContents.capturePage()).toPNG());
  } catch (e) { aus.fehler = e.message; }
  console.log('RAUCH ' + JSON.stringify(aus));
  app.exit(0);
}, 2500));
