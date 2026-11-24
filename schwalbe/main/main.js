'use strict';
// Schwalbe – Hauptprozess: Fenster, Dokumente, .docx, PDF, Claude.
const { app, BrowserWindow, ipcMain, dialog, shell, session, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { Dokumente } = require('../kern/dokumente');
const { docxSchreiben, docxLesen } = require('../kern/docx');
const { Einstellungen } = require('../kern/einstellungen');
const Hirn = require('../kern/hirn');
const Eingebaut = require('../kern/eingebaut');
const A = require('../kern/assistent');

let fenster = null;
let dokumente = null;
let einstellungen = null;

// Zum Testen ohne Claude
const frage = process.env.SCHWALBE_SPIELHIRN
  ? async (a) => ({ text: JSON.stringify(/kürzer/i.test(a.auftrag) ? { antwort: 'Hab den Absatz gekürzt.', aktion: 'auswahl', html: 'Kurz und knapp.' } : /brief/i.test(a.auftrag) ? { antwort: 'Hier ist dein Brief. Den Namen hab ich als [Name] gelassen.', aktion: 'dokument', html: '<p>Nufringen, 24. November 2026</p><h1>Einladung zur Weihnachtsfeier</h1><p>Liebe Kolleginnen und Kollegen,</p><p>wir feiern am Freitag, 18. Dezember, ab 17 Uhr in der Kantine.</p><ul><li>17:00 Glühwein</li><li>18:30 Buffet</li></ul><p>Viele Grüße<br>[Name]</p>' } : { antwort: 'Klingt gut so. Vielleicht noch eine Zwischenüberschrift?', aktion: 'keine' }), weg: 'spiel' })
  : (a, e, o) => Hirn.frage(a, e, o);

function handle(name, fn) {
  ipcMain.handle(name, async (_e, ...args) => {
    try { return await fn(...args); } catch (f) { return { fehler: { art: f.art || 'fehler', nachricht: f.message || String(f) } }; }
  });
}
const sauber = (n) => String(n || 'Dokument').replace(/[\\/:*?"<>|]/g, ' ').trim() || 'Dokument';

function oeffneArg(argv) {
  const id = argv.find((a) => a.startsWith('--oeffne='))?.slice(9);
  if (id && /^[a-z0-9-]{6,40}$/.test(id)) return { id };
  const datei = argv.slice(1).find((a) => /\.docx$/i.test(a) && fs.existsSync(a));
  return datei ? { datei } : null;
}

async function druckFenster(html) {
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, javascript: false } });
  await w.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(String(html))}`);
  return w;
}

function registriere() {
  handle('dok:liste', () => dokumente.liste());
  handle('dok:neu', (name, html) => dokumente.neu(name, html));
  handle('dok:lesen', (id) => dokumente.lesen(id));
  handle('dok:speichern', (d) => dokumente.speichern(d));
  handle('dok:loeschen', (id) => dokumente.loeschen(id));

  handle('datei:importieren', async (pfad) => {
    let datei = pfad;
    if (!datei) {
      const r = await dialog.showOpenDialog(fenster, { title: 'Dokument öffnen', filters: [{ name: 'Word-Dokumente', extensions: ['docx'] }, { name: 'Text', extensions: ['txt', 'md'] }], properties: ['openFile'] });
      if (r.canceled || !r.filePaths[0]) return { abgebrochen: true };
      datei = r.filePaths[0];
    }
    const name = path.basename(datei).replace(/\.[^.]+$/, '');
    if (/\.docx$/i.test(datei)) { const r = await docxLesen(fs.readFileSync(datei)); return dokumente.neu(name, r.html, r); }
    const html = fs.readFileSync(datei, 'utf8').split(/\r?\n\r?\n/).map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\r?\n/g, '<br>')}</p>`).join('');
    return dokumente.neu(name, html);
  });
  handle('datei:docx', async ({ bloecke, name, opt }) => {
    const r = await dialog.showSaveDialog(fenster, { title: 'Als Word-Datei speichern', defaultPath: path.join(app.getPath('documents'), `${sauber(name)}.docx`), filters: [{ name: 'Word', extensions: ['docx'] }] });
    if (r.canceled || !r.filePath) return { abgebrochen: true };
    fs.writeFileSync(r.filePath, await docxSchreiben(Array.isArray(bloecke) ? bloecke : [], name, opt || {}));
    return { ok: true, datei: r.filePath };
  });
  handle('datei:pdf', async ({ html, name, kopf, fuss, seitenzahlen }) => {
    const r = await dialog.showSaveDialog(fenster, { title: 'Als PDF speichern', defaultPath: path.join(app.getPath('documents'), `${sauber(name)}.pdf`), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return { abgebrochen: true };
    const w = await druckFenster(html);
    try {
      const e = (t) => String(t || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      const stil = 'font-family:Arial,sans-serif;font-size:8px;color:#666;width:100%;padding:0 22mm;display:flex;justify-content:space-between';
      fs.writeFileSync(r.filePath, await w.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { marginType: 'none' }, displayHeaderFooter: true,
        headerTemplate: `<div style="${stil}"><span>${e(kopf)}</span></div>`,
        footerTemplate: `<div style="${stil}"><span>${e(fuss)}</span><span>${seitenzahlen ? 'Seite <span class="pageNumber"></span> von <span class="totalPages"></span>' : ''}</span></div>` }));
    } finally { w.destroy(); }
    return { ok: true, datei: r.filePath };
  });
  handle('datei:drucken', async ({ html }) => {
    const w = await druckFenster(html);
    try { await new Promise((ok, fehl) => w.webContents.print({ silent: false, printBackground: true }, (gut, grund) => (gut || grund === 'cancelled' ? ok() : fehl(new Error(grund))))); } finally { w.destroy(); }
    return { ok: true };
  });
  handle('datei:zeigen', (p) => { shell.showItemInFolder(p); return true; });
  handle('link:oeffnen', (u) => { if (/^(https?:\/\/|mailto:)/i.test(String(u))) shell.openExternal(String(u)); return true; });

  handle('assistent', async ({ wunsch, html, auswahl, name }) => {
    const { text, weg } = await frage({ system: A.SYSTEM, auftrag: A.auftrag({ wunsch, html, auswahl, name }) }, einstellungen.alle());
    return { ...A.leseAntwort(text), weg };
  });
  handle('einstellungen:lesen', () => ({ ...einstellungen.fuerOberflaeche(), eingebaut: Eingebaut.status(), version: app.getVersion() }));
  handle('einstellungen:setzen', (neu) => einstellungen.setze(neu));
  handle('hirn:testen', async () => {
    const { text, weg } = await frage({ system: 'Antworte nur mit dem Wort OK.', auftrag: 'Bist du da?' }, einstellungen.alle(), { schnell: true });
    return { ok: /ok/i.test(text), weg };
  });
}

function netzSperren() {
  session.defaultSession.webRequest.onBeforeRequest((d, antwort) => antwort({ cancel: !/^(file|data|blob|devtools|chrome-extension):/i.test(d.url) }));
}

function oeffneFenster() {
  fenster = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 660, title: 'Schwalbe', backgroundColor: '#2c5aa0', autoHideMenuBar: true,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#2c5aa0', symbolColor: '#ffffff', height: 46 },
    icon: path.join(__dirname, '..', 'bau', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
  });
  fenster.webContents.session.setSpellCheckerLanguages?.(['de-DE']);
  fenster.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  fenster.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  fenster.webContents.on('will-navigate', (e) => e.preventDefault());
  fenster.webContents.once('did-finish-load', () => { const o = oeffneArg(process.argv); if (o) fenster.webContents.send('start:oeffne', o); });
}

function start() {
  const daten = app.getPath('userData');
  try { fs.mkdirSync(daten, { recursive: true }); fs.writeFileSync(path.join(daten, 'version.json'), JSON.stringify({ version: app.getVersion(), pfad: process.execPath })); } catch { /* egal */ }
  dokumente = new Dokumente(path.join(daten, 'dokumente'));
  einstellungen = new Einstellungen(path.join(daten, 'einstellungen.json'));
  Menu.setApplicationMenu(null);
  registriere();
  netzSperren();
  oeffneFenster();
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_e, argv) => {
    if (!fenster) return;
    if (fenster.isMinimized()) fenster.restore();
    fenster.focus();
    const o = oeffneArg(argv); if (o) fenster.webContents.send('start:oeffne', o);
  });
  app.whenReady().then(start);
  app.on('window-all-closed', () => app.quit());
}
module.exports = { oeffneArg };
