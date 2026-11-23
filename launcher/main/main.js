'use strict';
// Selbst gfaltet – das Startfenster der Familie.
// Findet die installierten Vögel, startet sie und zeigt die zuletzt bearbeiteten Dateien.
const { app, BrowserWindow, ipcMain, shell, net } = require('electron');
const os = require('os');
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

// ---------- Updates (aus dem öffentlichen Download-Repo) ----------
const DOWNLOADS = 'https://api.github.com/repos/sirseagull69/selbst-gfaltet-downloads/releases?per_page=60';
const PRAEFIX = { kranich: 'kranich-v', albatros: 'albatros-v', schreiben: 'schreiben-v', start: 'start-v' };
const neuer = (a, b) => { const x = String(a).split('.').map(Number), y = String(b || '0').split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
function passendeDatei(assets) {
  if (WIN) return assets.find((a) => /\.exe$/i.test(a.name));
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  return assets.find((a) => a.name.endsWith(`${arch}.dmg`)) || assets.find((a) => /\.dmg$/i.test(a.name));
}
function installiert(id) {
  if (id === 'start') return app.getVersion();
  const a = APPS.find((x) => x.id === id);
  if (!a || a.art !== 'programm' || !fs.existsSync(pfadVon(a))) return null;
  try { return JSON.parse(fs.readFileSync(path.join(app.getPath('appData'), a.datei, 'version.json'), 'utf8')).version || '0'; } catch { return '0'; }
}
let neueste = {};
async function pruefeUpdates() {
  try {
    const r = await net.fetch(DOWNLOADS, { headers: { 'User-Agent': 'Selbst-gfaltet', Accept: 'application/vnd.github+json' } });
    if (!r.ok) return { fehler: `GitHub antwortet nicht (${r.status}).` };
    const releases = await r.json();
    neueste = {};
    for (const rel of releases) {
      if (rel.draft) continue;
      for (const [id, pre] of Object.entries(PRAEFIX)) {
        if (!rel.tag_name.startsWith(pre)) continue;
        const v = rel.tag_name.slice(pre.length);
        const datei = passendeDatei(rel.assets || []);
        if (datei && (!neueste[id] || neuer(v, neueste[id].version))) neueste[id] = { version: v, url: datei.browser_download_url, name: datei.name, groesse: datei.size };
      }
    }
    const aus = {};
    for (const id of Object.keys(PRAEFIX)) {
      const hier = installiert(id), da = neueste[id];
      aus[id] = { installiert: hier, neu: da?.version || null, update: !!(da && hier && neuer(da.version, hier)), installierbar: !!(da && !hier) };
    }
    return aus;
  } catch (f) { return { fehler: 'Keine Verbindung zum Update-Server.' }; }
}
async function ladeUndInstalliere(id, sender) {
  const da = neueste[id];
  if (!da) return { fehler: 'Kein Download gefunden.' };
  const ziel = path.join(os.tmpdir(), da.name.replace(/[^\w.-]/g, '_'));
  const r = await net.fetch(da.url, { headers: { 'User-Agent': 'Selbst-gfaltet' } });
  if (!r.ok || !r.body) return { fehler: `Download klappt nicht (${r.status}).` };
  const gesamt = Number(r.headers.get('content-length')) || da.groesse || 0;
  const aus = fs.createWriteStream(ziel);
  let geladen = 0, zuletzt = 0;
  const leser = r.body.getReader();
  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    aus.write(Buffer.from(value));
    geladen += value.length;
    const pct = gesamt ? Math.round((geladen / gesamt) * 100) : 0;
    if (pct !== zuletzt) { zuletzt = pct; sender.send('update:fortschritt', { id, pct }); }
  }
  await new Promise((ok) => aus.end(ok));
  if (WIN) {
    const kind = spawn(ziel, ['/S', '--force-run'], { detached: true, stdio: 'ignore' });
    kind.on('error', () => {}); kind.unref();
  } else {
    await shell.openPath(ziel);
  }
  if (id === 'start') setTimeout(() => app.quit(), 800);
  return { ok: true, mac: !WIN };
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
  if (!fs.existsSync(p)) return { fehler: a.bald ? 'bald' : 'fehlt' };
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
  ipcMain.handle('updates', () => pruefeUpdates());
  ipcMain.handle('update:laden', (e, id) => (PRAEFIX[id] ? ladeUndInstalliere(id, e.sender) : { fehler: 'Unbekannt.' }));
  ipcMain.handle('version', () => app.getVersion());
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
