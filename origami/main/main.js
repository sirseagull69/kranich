'use strict';
// origami als eigene App der Familie „Selbst gfaltet“.
// Öffnet origami vom Heim-PC in einem eigenen Fenster statt im Browser.
// Startfenster übergibt: --adresse=<url> und --frage=<text>.
const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { normAdresse, leseArgumente, zielUrl, gleicherServer } = require('../kern/argumente');

// ---------- Einstellungen ----------
const einstDatei = () => path.join(app.getPath('userData'), 'einstellungen.json');
function einst() { try { return { adresse: '', fenster: null, ...JSON.parse(fs.readFileSync(einstDatei(), 'utf8')) }; } catch { return { adresse: '', fenster: null }; } }
function einstSetzen(neu) {
  const e = { ...einst(), ...neu };
  try { fs.mkdirSync(path.dirname(einstDatei()), { recursive: true }); fs.writeFileSync(einstDatei(), JSON.stringify(e, null, 2)); } catch { /* egal */ }
  return e;
}

let fenster = null;
const seite = (grund) => fenster.loadFile(path.join(__dirname, '..', 'ui', 'einrichten.html'), { query: { grund } });

function oeffne(frage = '') {
  if (!fenster) return;
  const adr = einst().adresse;
  if (!adr) { seite('neu'); return; }
  fenster.loadURL(zielUrl(adr, frage)).catch(() => { /* did-fail-load kümmert sich */ });
}

// Nur die eigenen Seiten (einrichten.html) dürfen die Einstellungen ändern, nicht die Webseite.
const vonUns = (e) => { try { return new URL(e.senderFrame.url).protocol === 'file:'; } catch { return false; } };

function registriere() {
  ipcMain.handle('einst', (e) => (vonUns(e) ? { adresse: einst().adresse, version: app.getVersion() } : null));
  ipcMain.handle('setzen', (e, roh) => {
    if (!vonUns(e)) return { fehler: 'Nicht erlaubt.' };
    const adresse = normAdresse(roh);
    if (!adresse) return { fehler: 'Das sieht nicht nach einer Adresse aus.' };
    einstSetzen({ adresse });
    setTimeout(() => oeffne(), 50);
    return { ok: true };
  });
  ipcMain.handle('nochmal', (e) => { if (vonUns(e)) setTimeout(() => oeffne(), 50); return true; });
}

function baueFenster(frage) {
  const b = einst().fenster || {};
  fenster = new BrowserWindow({
    width: b.width || 1180, height: b.height || 800, x: b.x, y: b.y, minWidth: 420, minHeight: 520,
    title: 'origami', backgroundColor: '#fff6ee', autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, '..', 'bau', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
  });
  if (b.max) fenster.maximize();
  fenster.once('ready-to-show', () => fenster.show());
  fenster.on('close', () => { const max = fenster.isMaximized(); einstSetzen({ fenster: { ...(max ? einst().fenster : fenster.getNormalBounds()), max } }); });
  fenster.on('closed', () => { fenster = null; });

  const wc = fenster.webContents;
  // Heim-PC nicht erreichbar → freundliche Seite statt weißem Fenster
  wc.on('did-fail-load', (_e, code, _text, url, hauptframe) => {
    if (!hauptframe || code === -3 || String(url).startsWith('file:')) return;
    seite('offline');
  });
  // Links zu fremden Seiten im Browser öffnen, origami selbst bleibt im Fenster
  wc.setWindowOpenHandler(({ url }) => {
    if (gleicherServer(url, einst().adresse)) { wc.loadURL(url); return { action: 'deny' }; }
    if (/^https?:|^mailto:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (url.startsWith('file:') || gleicherServer(url, einst().adresse)) return;
    e.preventDefault();
    if (/^https?:|^mailto:/i.test(url)) shell.openExternal(url);
  });
  // Tasten: F5 neu laden, Strg+, Adresse ändern
  wc.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F5') { e.preventDefault(); oeffne(); }
    else if ((i.control || i.meta) && i.key === ',') { e.preventDefault(); seite('einst'); }
  });
  // Nur zum Testen: Bild vom Fenster speichern
  if (process.env.ORIGAMI_FOTO) wc.on('did-finish-load', () => setTimeout(async () => { fs.writeFileSync(process.env.ORIGAMI_FOTO, (await wc.capturePage()).toPNG()); app.quit(); }, 1500));
  oeffne(frage);
}

// Mikrofon, Benachrichtigungen, Zwischenablage nur für origami selbst
function rechte() {
  session.defaultSession.setPermissionRequestHandler((wc, recht, ok, details) => {
    const erlaubt = ['media', 'notifications', 'clipboard-sanitized-write', 'clipboard-read', 'fullscreen'];
    ok(erlaubt.includes(recht) && gleicherServer(details.requestingUrl || wc.getURL(), einst().adresse));
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  // Startfenster hat eine Adresse mitgegeben → übernehmen
  const start = leseArgumente(process.argv);
  app.on('second-instance', (_e, argv) => {
    const a = leseArgumente(argv);
    if (a.adresse && a.adresse !== einst().adresse) einstSetzen({ adresse: a.adresse });
    if (!fenster) { baueFenster(a.frage); return; }
    if (fenster.isMinimized()) fenster.restore();
    fenster.focus();
    if (a.frage || a.adresse) oeffne(a.frage);
  });
  app.whenReady().then(() => {
    if (start.adresse) einstSetzen({ adresse: start.adresse });
    // Version für das Startfenster (falls es die Dateiversion nicht lesen kann)
    try { fs.writeFileSync(path.join(app.getPath('userData'), 'version.json'), JSON.stringify({ version: app.getVersion(), pfad: process.execPath })); } catch { /* egal */ }
    registriere();
    rechte();
    baueFenster(start.frage);
  });
  app.on('window-all-closed', () => app.quit());
}
