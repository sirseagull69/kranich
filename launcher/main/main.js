'use strict';
// Selbst gfaltet – das Startfenster der Familie.
// Findet die installierten Vögel, startet sie und zeigt die zuletzt bearbeiteten Dateien.
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const WIN = process.platform === 'win32';
const lokal = () => process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local');

const APPS = [
  { id: 'origami', name: 'origami', aufgabe: 'Dein KI-Assistent', farbe: '#e8743b', hell: '#ffeadb', art: 'web' },
  { id: 'kranich', name: 'Kranich', aufgabe: 'Gestalten', farbe: '#7c5cd6', hell: '#ece6fd', art: 'programm', datei: 'Kranich', release: 'https://github.com/sirseagull69/kranich/releases/latest' },
  { id: 'albatros', name: 'Albatros', aufgabe: 'Tabellen', farbe: '#2f8a55', hell: '#dcf0e3', art: 'programm', datei: 'Albatros', bald: true },
  { id: 'schreiben', name: 'Schreibprogramm', aufgabe: 'Schreiben', farbe: '#c47f17', hell: '#f8ead2', art: 'programm', datei: 'Schreiben', bald: true },
];

// ---------- Einstellungen ----------
const einstDatei = () => path.join(app.getPath('userData'), 'einstellungen.json');
const STANDARD = { origamiAdresse: '', nachStartSchliessen: true, pfade: {} };
function einst() { try { return { ...STANDARD, ...JSON.parse(fs.readFileSync(einstDatei(), 'utf8')) }; } catch { return { ...STANDARD }; } }
function einstSetzen(neu) {
  const e = { ...einst(), ...neu };
  if (e.origamiAdresse && !/^https?:\/\//i.test(e.origamiAdresse)) e.origamiAdresse = `http://${e.origamiAdresse}`;
  fs.mkdirSync(path.dirname(einstDatei()), { recursive: true });
  fs.writeFileSync(einstDatei(), JSON.stringify(e, null, 2));
  return e;
}

// ---------- Programme finden ----------
function standardPfad(a) {
  if (!a.datei) return '';
  return WIN ? path.join(lokal(), 'Programs', a.datei, `${a.datei}.exe`) : `/Applications/${a.datei}.app`;
}
function pfadVon(a) { return einst().pfade?.[a.id] || standardPfad(a); }
function status(a) {
  if (a.art === 'web') return einst().origamiAdresse ? 'bereit' : 'adresse';
  return fs.existsSync(pfadVon(a)) ? 'bereit' : a.bald ? 'bald' : 'fehlt';
}

// ---------- Zuletzt bearbeitet (aus den Projektordnern der Vögel) ----------
function zuletzt() {
  const liste = [];
  const ordner = path.join(app.getPath('appData'), 'Kranich', 'projekte');
  try {
    for (const id of fs.readdirSync(ordner)) {
      if (!/^[a-z0-9-]{6,40}$/.test(id)) continue;
      try {
        const p = JSON.parse(fs.readFileSync(path.join(ordner, id, 'projekt.json'), 'utf8'));
        const vorschauPfad = path.join(ordner, id, 'vorschau.png');
        const vorschau = fs.existsSync(vorschauPfad) ? `data:image/png;base64,${fs.readFileSync(vorschauPfad).toString('base64')}` : '';
        const n = p.seiten?.length || 0;
        liste.push({ app: 'kranich', id, name: p.name, geaendert: p.geaendert, info: p.art === 'bild' ? 'Bild' : p.app ? `Ganze App · ${n} Boards` : n > 1 ? `${n} Boards` : (p.seiten?.[0]?.name || 'Entwurf'), vorschau });
      } catch { /* kaputtes Projekt überspringen */ }
    }
  } catch { /* Kranich noch nie benutzt */ }
  return liste.sort((a, b) => String(b.geaendert).localeCompare(String(a.geaendert))).slice(0, 12);
}

// ---------- Starten ----------
function starte(id, args = []) {
  const a = APPS.find((x) => x.id === id);
  if (!a) return { fehler: 'Unbekanntes Programm.' };
  if (a.art === 'web') {
    const adr = einst().origamiAdresse;
    if (!adr) return { fehler: 'adresse' };
    const frage = args.find((x) => x.startsWith('--frage='))?.slice(8);
    shell.openExternal(frage ? `${adr}${adr.includes('?') ? '&' : '?'}frage=${encodeURIComponent(frage)}` : adr);
    return { ok: true };
  }
  const p = pfadVon(a);
  if (!fs.existsSync(p)) {
    if (a.release) shell.openExternal(a.release);
    return { fehler: a.bald ? 'bald' : 'fehlt' };
  }
  const kind = WIN ? spawn(p, args, { detached: true, stdio: 'ignore' }) : spawn('open', ['-a', p, '--args', ...args], { detached: true, stdio: 'ignore' });
  kind.on('error', () => {});
  kind.unref();
  if (einst().nachStartSchliessen) setTimeout(() => app.quit(), 1200);
  return { ok: true };
}

function registriere() {
  ipcMain.handle('apps', () => APPS.map((a) => ({ ...a, status: status(a), pfad: a.art === 'programm' ? pfadVon(a) : '' })));
  ipcMain.handle('zuletzt', () => zuletzt());
  ipcMain.handle('starte', (_e, id, args) => starte(id, Array.isArray(args) ? args.filter((x) => typeof x === 'string').slice(0, 4) : []));
  ipcMain.handle('einst', () => einst());
  ipcMain.handle('einst:setzen', (_e, neu) => einstSetzen({ origamiAdresse: String(neu?.origamiAdresse ?? einst().origamiAdresse).trim().slice(0, 300), nachStartSchliessen: neu?.nachStartSchliessen ?? einst().nachStartSchliessen, pfade: typeof neu?.pfade === 'object' ? neu.pfade : einst().pfade }));
}

function fenster() {
  const w = new BrowserWindow({
    width: 1180, height: 780, minWidth: 900, minHeight: 620,
    title: 'Selbst gfaltet', backgroundColor: '#f4f0e8', autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'bau', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  w.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  // Nur zum Testen: Bild vom Fenster speichern
  if (process.env.LAUNCHER_FOTO) w.webContents.once('did-finish-load', () => setTimeout(async () => { fs.writeFileSync(process.env.LAUNCHER_FOTO, (await w.webContents.capturePage()).toPNG()); app.quit(); }, 1800));
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  w.webContents.on('will-navigate', (e) => e.preventDefault());
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
  app.whenReady().then(() => { registriere(); fenster(); });
  app.on('window-all-closed', () => app.quit());
}
