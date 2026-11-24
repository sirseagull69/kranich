'use strict';
// Schwalbe – Hauptprozess: Fenster, Dokumente, .docx, PDF, Claude.
const { app, BrowserWindow, ipcMain, dialog, shell, session, Menu } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { Dokumente } = require('../kern/dokumente');
const { Albatros } = require('../kern/albatros');
const { docxSchreiben, docxLesen } = require('../kern/docx');
const { Einstellungen } = require('../kern/einstellungen');
const Hirn = require('../kern/hirn');
const Eingebaut = require('../kern/eingebaut');
const A = require('../kern/assistent');

// Rechtschreibung: Unter Windows nimmt Chromium sonst die Windows-Prüfung – die kennt Deutsch oft nicht
// (dann ist „Kündigung“ falsch und es gibt keine Vorschläge). Mit Hunspell lädt sie das deutsche Wörterbuch selbst.
if (process.platform === 'win32') app.commandLine.appendSwitch('disable-features', 'WinUseBrowserSpellChecker');

let fenster = null;
let dateiOffen = { ungespeichert: false, name: '' };
let schliessenErlaubt = false;
// Zuletzt verwendete Dateien (wie in Office, auch in der Windows-Sprungliste)
const zuletztDatei = () => path.join(app.getPath('userData'), 'zuletzt.json');
function zuletztLesen() { try { return JSON.parse(fs.readFileSync(zuletztDatei(), 'utf8')); } catch { return []; } }
function zuletztMerken(pfad) {
  const liste = [{ pfad, name: path.basename(pfad), zeit: new Date().toISOString() }, ...zuletztLesen().filter((z) => path.resolve(z.pfad).toLowerCase() !== path.resolve(pfad).toLowerCase())].slice(0, 25);
  try { fs.writeFileSync(zuletztDatei(), JSON.stringify(liste), 'utf8'); } catch { /* egal */ }
  try { app.addRecentDocument(pfad); } catch { /* egal */ }
}
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
  const datei = argv.slice(1).find((a) => /\.(docx|txt|md)$/i.test(a) && fs.existsSync(a));
  return datei ? { datei } : null;
}

async function druckFenster(html) {
  const w = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, javascript: false } });
  await w.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(String(html))}`);
  return w;
}

function registriere() {
  handle('dok:liste', () => dokumente.liste());
  const alba = new Albatros(app.getPath('appData'));
  handle('albatros:liste', () => alba.liste());
  handle('albatros:tabelle', ({ id, blatt }) => alba.html(id, Number(blatt) || 0));
  handle('albatros:oeffnen', (id) => {
    const exe = process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Albatros', 'Albatros.exe') : '';
    if (exe && fs.existsSync(exe)) { require('node:child_process').spawn(exe, [`--oeffne=${id}`], { detached: true, stdio: 'ignore' }).unref(); return true; }
    throw new Error('Albatros ist auf diesem PC nicht installiert.');
  });
  handle('system:name', () => { try { const n = os.userInfo().username || ''; return n.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); } catch { return ''; } });
  handle('dok:neu', (name, html) => dokumente.neu(name, html));
  handle('dok:lesen', (id) => dokumente.lesen(id));
  handle('dok:speichern', (d) => dokumente.speichern(d));
  handle('dok:loeschen', (id) => dokumente.loeschen(id));

  // Datei öffnen: lesen, mit dem Dokument verbinden (Speichern schreibt wieder in genau diese Datei)
  const inhaltLesen = async (datei) => {
    if (/\.docx$/i.test(datei)) return docxLesen(fs.readFileSync(datei));
    const t = fs.readFileSync(datei, 'utf8');
    return { html: t.split(/\r?\n\r?\n/).map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\r?\n/g, '<br>') || '<br>'}</p>`).join('') };
  };
  handle('datei:importieren', async (pfad) => {
    let datei = pfad;
    if (!datei) {
      const e = einstellungen.alle();
      const r = await dialog.showOpenDialog(fenster, { title: 'Öffnen', defaultPath: e.standardOrdner || app.getPath('documents'), filters: [{ name: 'Alle Dokumente', extensions: ['docx', 'txt', 'md'] }, { name: 'Word-Dokumente', extensions: ['docx'] }, { name: 'Text', extensions: ['txt', 'md'] }], properties: ['openFile'] });
      if (r.canceled || !r.filePaths[0]) return { abgebrochen: true };
      datei = r.filePaths[0];
    }
    if (!fs.existsSync(datei)) throw new Error('Die Datei gibt es nicht mehr.');
    const inhalt = await inhaltLesen(datei);
    zuletztMerken(datei);
    const da = dokumente.zuDatei(datei);
    if (da) return dokumente.ausDatei(da.id, inhalt);
    const d = dokumente.neu(path.basename(datei).replace(/\.[^.]+$/, ''), inhalt.html, { ...inhalt, datei });
    dokumente.speichern({ id: d.id, dateiStand: new Date().toISOString() });
    return d;
  });
  // Speichern: in die verbundene Datei – ohne Nachfrage. Ohne Datei (oder mit ziel: 'neu') fragt „Speichern unter“.
  handle('datei:speichern', async ({ id, bloecke, text, name, opt, unter, format }) => {
    const d = dokumente.lesen(id);
    let ziel = !unter && d.datei ? d.datei : null;
    if (!ziel) {
      const e = einstellungen.alle();
      const fmt = format || (d.datei ? path.extname(d.datei).slice(1).toLowerCase() : 'docx');
      const r = await dialog.showSaveDialog(fenster, { title: 'Speichern unter', defaultPath: path.join(d.datei ? path.dirname(d.datei) : (e.standardOrdner || app.getPath('documents')), `${sauber(name || d.name)}.${fmt === 'txt' || fmt === 'md' ? fmt : 'docx'}`),
        filters: [{ name: 'Word-Dokument', extensions: ['docx'] }, { name: 'Nur Text', extensions: ['txt'] }, { name: 'Markdown', extensions: ['md'] }] });
      if (r.canceled || !r.filePath) return { abgebrochen: true };
      ziel = r.filePath;
    }
    if (/\.(txt|md)$/i.test(ziel)) fs.writeFileSync(ziel, String(text || ''), 'utf8');
    else fs.writeFileSync(ziel, await docxSchreiben(Array.isArray(bloecke) ? bloecke : [], name || d.name, opt || {}));
    const stand = new Date().toISOString();
    dokumente.speichern({ id, name: d.name === 'Neues Dokument' || unter ? path.basename(ziel).replace(/\.[^.]+$/, '') : d.name, html: d.html, datei: ziel, dateiStand: stand });
    zuletztMerken(ziel);
    return { ok: true, datei: ziel, stand, name: path.basename(ziel).replace(/\.[^.]+$/, '') };
  });
  handle('datei:ordnerWaehlen', async () => { const r = await dialog.showOpenDialog(fenster, { title: 'Ordner wählen', properties: ['openDirectory', 'createDirectory'] }); return r.canceled ? null : r.filePaths[0]; });
  handle('datei:textKopie', async ({ name, text }) => {
    const r = await dialog.showSaveDialog(fenster, { title: 'Als Text exportieren', defaultPath: path.join(einstellungen.alle().standardOrdner || app.getPath('documents'), `${sauber(name)}.txt`), filters: [{ name: 'Text', extensions: ['txt'] }] });
    if (r.canceled || !r.filePath) return { abgebrochen: true };
    fs.writeFileSync(r.filePath, String(text || ''), 'utf8'); return { ok: true, datei: r.filePath };
  });
  handle('datei:info', (pfad) => { try { const st = fs.statSync(pfad); return { groesse: st.size, geaendert: st.mtime.toISOString(), da: true }; } catch { return { da: false }; } });
  handle('zuletzt:liste', () => zuletztLesen().filter((z) => fs.existsSync(z.pfad)).slice(0, 15));
  handle('datei:status', ({ ungespeichert, name }) => { dateiOffen = { ungespeichert: Boolean(ungespeichert), name: String(name || '') }; fenster?.setTitle(`${dateiOffen.ungespeichert ? '• ' : ''}${dateiOffen.name || 'Schwalbe'} – Schwalbe`); return true; });
  handle('fenster:schliessen', () => { schliessenErlaubt = true; fenster?.close(); return true; });
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
  try { fenster.webContents.session.setSpellCheckerLanguages?.(['de-DE']); } catch { /* macOS nimmt die Systemsprache */ }
  // Rechtsklick: Rechtschreibvorschläge, Wörterbuch, Ausschneiden/Kopieren/Einfügen
  fenster.webContents.on('context-menu', (_e, p) => {
    const vorlage = [];
    if (p.misspelledWord) {
      for (const v of p.dictionarySuggestions.slice(0, 6)) vorlage.push({ label: v, click: () => fenster.webContents.replaceMisspelling(v) });
      if (!p.dictionarySuggestions.length) vorlage.push({ label: 'Keine Vorschläge im Wörterbuch', enabled: false });
      vorlage.push({ label: 'Von der Schwalbe korrigieren lassen', click: () => fenster.webContents.send('rechtschreibung:frage', p.misspelledWord) });
      vorlage.push({ type: 'separator' }, { label: `„${p.misspelledWord}“ ins Wörterbuch`, click: () => fenster.webContents.session.addWordToSpellCheckerDictionary(p.misspelledWord) }, { type: 'separator' });
    }
    if (p.isEditable) vorlage.push({ label: 'Ausschneiden', role: 'cut', enabled: p.editFlags.canCut }, { label: 'Kopieren', role: 'copy', enabled: p.editFlags.canCopy }, { label: 'Einfügen', role: 'paste', enabled: p.editFlags.canPaste }, { type: 'separator' }, { label: 'Alles markieren', role: 'selectAll' });
    else if (p.selectionText) vorlage.push({ label: 'Kopieren', role: 'copy' });
    if (vorlage.length) Menu.buildFromTemplate(vorlage).popup({ window: fenster });
  });
  fenster.on('close', (e) => {
    if (schliessenErlaubt || !dateiOffen.ungespeichert) return;
    e.preventDefault();
    const w = dialog.showMessageBoxSync(fenster, { type: 'question', buttons: ['Speichern', 'Nicht speichern', 'Abbrechen'], defaultId: 0, cancelId: 2, title: 'Schwalbe', message: `Änderungen an „${dateiOffen.name}“ speichern?`, detail: 'Wenn du nicht speicherst, bleibt die Datei auf dem alten Stand. In der Schwalbe ist trotzdem alles noch da.' });
    if (w === 0) fenster.webContents.send('datei:speichernUndZu');
    else if (w === 1) { schliessenErlaubt = true; fenster.close(); }
  });
  fenster.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  fenster.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  fenster.webContents.on('will-navigate', (e) => e.preventDefault());
  fenster.webContents.once('did-finish-load', () => { const o = oeffneArg(process.argv); if (o) fenster.webContents.send('start:oeffne', o); });
}

function start() {
  const daten = app.getPath('userData');
  try { fs.mkdirSync(daten, { recursive: true }); fs.writeFileSync(path.join(daten, 'version.json'), JSON.stringify({ version: app.getVersion(), pfad: process.execPath })); } catch { /* egal */ }
  dokumente = new Dokumente(path.join(daten, 'dokumente'));
  einstellungen = new Einstellungen(path.join(daten, 'einstellungen.json'), path.join(app.getPath('appData'), 'Ori Office', 'gemeinsam.json'));
  Menu.setApplicationMenu(null);
  registriere();
  netzSperren();
  oeffneFenster();
}


// ---------- Ori Office: Drehscheibe (verbindet alle offenen Vögel, Grundlage für Ori als Copilot) ----------
const Drehscheibe = require('../kern/drehscheibe');
let scheibe = null;
function drehscheibeStarten() {
  try {
    scheibe = Drehscheibe.starte({ name: 'schwalbe', titel: 'Schwalbe', ordner: path.join(app.getPath('appData'), 'Ori Office'), beiAnfrage: Drehscheibe.anOberflaeche(() => fenster) });
    ipcMain.handle('ori:frage', (_e, an, typ, extra) => scheibe.frage(String(an), String(typ), extra && typeof extra === 'object' ? extra : {}));
    ipcMain.handle('ori:apps', () => scheibe.apps());
    app.on('before-quit', () => { scheibe?.stopp(); });
  } catch (f) { console.error('Drehscheibe:', f); }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_e, argv) => {
    if (!fenster) return;
    if (fenster.isMinimized()) fenster.restore();
    fenster.focus();
    const o = oeffneArg(argv); if (o) fenster.webContents.send('start:oeffne', o);
  });
  app.whenReady().then(() => { start(); drehscheibeStarten(); });
  app.on('window-all-closed', () => app.quit());
}
module.exports = { oeffneArg };
