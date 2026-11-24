'use strict';
// Albatros – Hauptprozess: Fenster, Dateien, Claude.
const { app, BrowserWindow, ipcMain, dialog, shell, session, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { Tabellen, importieren, xlsxSchreiben, csvSchreiben } = require('../kern/datei');
const { Einstellungen } = require('../kern/einstellungen');
const Hirn = require('../kern/hirn');
const Eingebaut = require('../kern/eingebaut');
const A = require('../kern/assistent');

let fenster = null;
let tabellen = null;
let einstellungen = null;

// Zum Testen ohne Claude
const frage = process.env.ALBATROS_SPIELHIRN
  ? async (a) => ({ text: JSON.stringify(a.system === A.MAKRO ? { antwort: 'Das Makro schreibt das Datum in die erste freie Zeile.', name: 'Datum eintragen', code: 'const z = tab.letzteZeile("A") + 1;\ntab.setze(tab.adresse("A", z), tab.heute());\ntab.meldung("Datum in Zeile " + z + " eingetragen.");' } : a.system === A.ERKLAEREN ? { antwort: 'Diese Formel zählt alle Beträge zusammen.' } : { antwort: 'Fertig: Summe unten eingetragen und Beträge als Euro.', zellen: { A1: 'Was', B1: 'Betrag', A2: 'Miete', B2: '820', A3: 'Essen', B3: '350', A4: 'Summe', B4: '=SUMME(B2:B3)' }, formate: { 'B2:B4': 'eur' }, fett: { 'A1:B1': true, 'A4:B4': true }, farben: { B2: '#f6d5c4' }, breiten: { A: 200 }, name: 'Monatsbudget', diagramm: /diagramm/i.test(a.auftrag) ? { werte: 'B2:B3', beschriftung: 'A2:A3', art: 'balken', titel: 'Ausgaben' } : undefined }), weg: 'spiel' })
  : (a, e, o) => Hirn.frage(a, e, o);

function handle(name, fn) {
  ipcMain.handle(name, async (_e, ...args) => {
    try { return await fn(...args); } catch (f) { return { fehler: { art: f.art || 'fehler', nachricht: f.message || String(f) } }; }
  });
}

function oeffneArg(argv) {
  const id = argv.find((a) => a.startsWith('--oeffne='))?.slice(9);
  if (id && /^[a-z0-9-]{6,40}$/.test(id)) return { id };
  const datei = argv.slice(1).find((a) => /\.(xlsx|xlsm|csv)$/i.test(a) && fs.existsSync(a));
  return datei ? { datei } : null;
}


// ---------- Stand-Fotos: die App fotografiert sich selbst (für Kranich) ----------
const standZuletzt = {};
function standFoto(name) {
  if (!/^[a-z0-9-]{3,40}$/.test(name) || !fenster || fenster.isMinimized() || !fenster.isVisible()) return false;
  if (Date.now() - (standZuletzt[name] || 0) < 30 * 60 * 1000) return false;
  standZuletzt[name] = Date.now();
  fenster.webContents.capturePage().then((bild) => {
    const b = bild.getSize().width > 1280 ? bild.resize({ width: 1280 }) : bild;
    const ordner = path.join(app.getPath('userData'), 'stand');
    fs.mkdirSync(ordner, { recursive: true });
    fs.writeFileSync(path.join(ordner, `${name}.jpg`), b.toJPEG(72));
  }).catch(() => {});
  return true;
}

function registriere() {
  handle('tabellen:liste', () => tabellen.liste());
  handle('tabellen:neu', (name, blaetter) => tabellen.neu(name, blaetter));
  handle('tabellen:lesen', (id) => tabellen.lesen(id));
  handle('tabellen:speichern', (t) => tabellen.speichern(t));
  handle('tabellen:loeschen', (id) => tabellen.loeschen(id));

  handle('datei:importieren', async (pfad) => {
    let datei = pfad;
    if (!datei) {
      const r = await dialog.showOpenDialog(fenster, { title: 'Tabelle öffnen', filters: [{ name: 'Tabellen', extensions: ['xlsx', 'xlsm', 'csv'] }], properties: ['openFile'] });
      if (r.canceled || !r.filePaths[0]) return { abgebrochen: true };
      datei = r.filePaths[0];
    }
    const { name, blaetter, vba } = await importieren(datei);
    const t = tabellen.neu(name, blaetter);
    if (vba?.length) { t.vba = vba; tabellen.speichern(t); }
    return t;
  });
  handle('datei:exportieren', async (t, art, blattNr = 0) => {
    const endung = { xlsx: 'xlsx', csv: 'csv', pdf: 'pdf' }[art];
    if (!endung) throw new Error('Unbekanntes Format.');
    const r = await dialog.showSaveDialog(fenster, { title: 'Exportieren', defaultPath: path.join(app.getPath('documents'), `${String(t.name || 'Tabelle').replace(/[\\/:*?"<>|]/g, ' ')}.${endung}`), filters: [{ name: endung.toUpperCase(), extensions: [endung] }] });
    if (r.canceled || !r.filePath) return { abgebrochen: true };
    if (art === 'xlsx') await xlsxSchreiben(t, r.filePath);
    else if (art === 'csv') fs.writeFileSync(r.filePath, csvSchreiben(t.blaetter[blattNr] || t.blaetter[0], t.blaetter), 'utf8');
    else fs.writeFileSync(r.filePath, await fenster.webContents.printToPDF({ landscape: true, printBackground: true, margins: { marginType: 'default' } }));
    return { ok: true, datei: r.filePath };
  });
  // Drucken / PDF aus einer eigenen, sauberen Druckansicht (nicht das ganze Fenster)
  handle('drucken', async ({ html, art, quer, titel }) => {
    const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, javascript: false } });
    try {
      await w.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(String(html))}`);
      if (art === 'drucker') {
        await new Promise((fertig, fehl) => w.webContents.print({ silent: false, printBackground: true, landscape: Boolean(quer) }, (ok, grund) => (ok || grund === 'cancelled' ? fertig() : fehl(new Error(grund)))));
        return { ok: true };
      }
      const r = await dialog.showSaveDialog(fenster, { title: 'Als PDF speichern', defaultPath: path.join(app.getPath('documents'), `${String(titel || 'Tabelle').replace(/[\\/:*?"<>|]/g, ' ')}.pdf`), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
      if (r.canceled || !r.filePath) return { abgebrochen: true };
      fs.writeFileSync(r.filePath, await w.webContents.printToPDF({ landscape: Boolean(quer), printBackground: true, margins: { marginType: 'default' }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' }));
      return { ok: true, datei: r.filePath };
    } finally { w.destroy(); }
  });
  handle('datei:bild', async (dataUrl, name) => {
    const r = await dialog.showSaveDialog(fenster, { title: 'Diagramm speichern', defaultPath: path.join(app.getPath('pictures'), `${String(name || 'Diagramm').replace(/[\\/:*?"<>|]/g, ' ')}.png`), filters: [{ name: 'PNG', extensions: ['png'] }] });
    if (r.canceled || !r.filePath) return { abgebrochen: true };
    fs.writeFileSync(r.filePath, Buffer.from(String(dataUrl).split(',')[1] || '', 'base64'));
    return { ok: true, datei: r.filePath };
  });
  handle('datei:zeigen', (p) => { shell.showItemInFolder(p); return true; });

  handle('assistent', async ({ wunsch, blatt, blaetter, auswahl, name }) => {
    const e = einstellungen.alle();
    const { text, weg } = await frage({ system: A.SYSTEM, auftrag: A.auftrag({ wunsch: String(wunsch).slice(0, 4000), blatt, blaetter, auswahl, name }) }, e);
    return { ...A.leseAntwort(text), weg };
  });
  handle('makro:schreiben', async ({ wunsch, vba, blatt, blaetter, auswahl, name }) => {
    const e = einstellungen.alle();
    const teil = vba ? `Übersetze dieses Excel-VBA-Makro:\n\n${String(vba).slice(0, 20000)}` : `Schreib ein Makro: ${String(wunsch).slice(0, 4000)}`;
    const { text, weg } = await frage({ system: A.MAKRO, auftrag: A.auftrag({ wunsch: teil, blatt, blaetter, auswahl, name }) }, e);
    return { ...A.leseAntwort(text), weg };
  });
  handle('erklaeren', async ({ blatt, blaetter, zelle }) => {
    const e = einstellungen.alle();
    const { text } = await frage({ system: A.ERKLAEREN, auftrag: A.auftrag({ wunsch: `Erkläre die Formel in ${zelle}: ${blatt.zellen[zelle]}`, blatt, blaetter, auswahl: zelle }) }, e, { schnell: true });
    return A.leseAntwort(text);
  });

  handle('stand:foto', (name) => standFoto(String(name)));
  handle('einstellungen:lesen', () => ({ ...einstellungen.fuerOberflaeche(), eingebaut: Eingebaut.status(), version: app.getVersion() }));
  handle('einstellungen:setzen', (neu) => einstellungen.setze(neu));
  handle('hirn:testen', async () => {
    const { text, weg } = await frage({ system: 'Antworte nur mit dem Wort OK.', auftrag: 'Bist du da?' }, einstellungen.alle(), { schnell: true });
    return { ok: /ok/i.test(text), weg };
  });
}

function netzSperren() {
  session.defaultSession.webRequest.onBeforeRequest((d, antwort) => {
    const erlaubt = /^(file|data|blob|devtools|chrome-extension):/i.test(d.url);
    antwort({ cancel: !erlaubt });
  });
}

function oeffneFenster() {
  fenster = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 660, title: 'Albatros', backgroundColor: '#2f7a4d', autoHideMenuBar: true,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#2f7a4d', symbolColor: '#ffffff', height: 46 },
    icon: path.join(__dirname, '..', 'bau', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  fenster.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  fenster.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  fenster.webContents.on('will-navigate', (e) => e.preventDefault());
  fenster.webContents.once('did-finish-load', () => { const o = oeffneArg(process.argv); if (o) fenster.webContents.send('start:oeffne', o); });
}

function start() {
  const daten = app.getPath('userData');
  try { fs.mkdirSync(daten, { recursive: true }); fs.writeFileSync(path.join(daten, 'version.json'), JSON.stringify({ version: app.getVersion(), pfad: process.execPath })); } catch { /* egal */ }
  tabellen = new Tabellen(path.join(daten, 'tabellen'));
  einstellungen = new Einstellungen(path.join(daten, 'einstellungen.json'), path.join(app.getPath('appData'), 'Ori Office', 'gemeinsam.json'));
  Menu.setApplicationMenu(null); // Strg+R/Strg+D gehören der Tabelle, nicht dem Menü
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
