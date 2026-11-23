'use strict';
// Selbst gfaltet – das Startfenster der Familie.
// Findet die installierten Vögel, startet sie und zeigt die zuletzt bearbeiteten Dateien.
const { app, BrowserWindow, ipcMain, shell, net } = require('electron');
const os = require('os');
const Claude = require('./claude');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const WIN = process.platform === 'win32';
const lokal = () => process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local');

const APPS = [
  { id: 'origami', name: 'origami', aufgabe: 'Dein KI-Assistent', farbe: '#e8743b', hell: '#ffeadb', art: 'web' },
  { id: 'kranich', name: 'Kranich', aufgabe: 'Gestalten', farbe: '#7c5cd6', hell: '#ece6fd', art: 'programm', datei: 'Kranich', release: 'https://github.com/sirseagull69/kranich/releases/latest' },
  { id: 'albatros', name: 'Albatros', aufgabe: 'Tabellen', farbe: '#2f8a55', hell: '#dcf0e3', art: 'programm', datei: 'Albatros' },
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
  // Albatros-Tabellen
  const tOrdner = path.join(app.getPath('appData'), 'Albatros', 'tabellen');
  try {
    for (const f of fs.readdirSync(tOrdner)) {
      if (!/^[a-z0-9-]{6,40}\.json$/.test(f)) continue;
      try {
        const t = JSON.parse(fs.readFileSync(path.join(tOrdner, f), 'utf8'));
        const n = Object.keys(t.blaetter?.[0]?.zellen || {}).length;
        liste.push({ app: 'albatros', id: t.id, name: t.name, geaendert: t.geaendert, info: `Tabelle · ${n} Zellen${t.blaetter?.length > 1 ? ` · ${t.blaetter.length} Blätter` : ''}`, vorschau: '' });
      } catch { /* kaputt */ }
    }
  } catch { /* Albatros noch nie benutzt */ }
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
// Welche Version ist wirklich installiert? Aus der Programmdatei selbst
// (Windows: Dateiversion der .exe, Mac: Info.plist), sonst aus version.json.
const { execFile } = require('child_process');
function dateiVersion(p) {
  return new Promise((ok) => {
    if (WIN) {
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(Get-Item -LiteralPath '${p.replace(/'/g, "''")}').VersionInfo.ProductVersion`], { windowsHide: true, timeout: 8000 }, (f, aus) => ok(f ? null : (/(\d+\.\d+\.\d+)/.exec(String(aus)) || [])[1] || null));
    } else {
      try { const t = fs.readFileSync(path.join(p, 'Contents', 'Info.plist'), 'utf8'); ok((/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/.exec(t) || [])[1] || null); } catch { ok(null); }
    }
  });
}
async function installiert(id) {
  if (id === 'start') return app.getVersion();
  const a = APPS.find((x) => x.id === id);
  if (!a || a.art !== 'programm' || !fs.existsSync(pfadVon(a))) return null;
  const v = await dateiVersion(pfadVon(a));
  if (v) return v;
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
      const hier = await installiert(id), da = neueste[id];
      aus[id] = { installiert: hier, neu: da?.version || null, update: !!(da && hier && neuer(da.version, hier)), installierbar: !!(da && !hier) };
    }
    return aus;
  } catch (f) { return { fehler: 'Keine Verbindung zum Update-Server.' }; }
}
async function ladeUndInstalliere(id, sender) {
  const da = neueste[id];
  if (!da) return { fehler: 'Kein Download gefunden.' };
  const ziel = path.join(os.tmpdir(), `${Date.now().toString(36)}-${da.name.replace(/[^\w.-]/g, '_')}`);
  const r = await net.fetch(da.url, { headers: { 'User-Agent': 'Selbst-gfaltet' } });
  if (!r.ok || !r.body) return { fehler: `Download klappt nicht (${r.status}).` };
  const gesamt = Number(r.headers.get('content-length')) || da.groesse || 0;
  const aus = fs.createWriteStream(ziel);
  let schreibFehler = null;
  aus.on('error', (f) => { schreibFehler = f; });
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
  if (schreibFehler) return { fehler: `Konnte den Download nicht speichern (${schreibFehler.code || schreibFehler.message}).` };
  if (WIN) {
    const kind = spawn(ziel, id === 'start' ? ['/S', '--force-run'] : ['/S'], { detached: true, stdio: 'ignore' });
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
  ipcMain.handle('apps', async () => Promise.all(APPS.map(async (a) => ({ ...a, status: status(a), pfad: a.art === 'programm' ? pfadVon(a) : '', version: a.art === 'programm' ? await installiert(a.id) : null }))));
  ipcMain.handle('zuletzt', () => zuletzt());
  ipcMain.handle('starte', (_e, id, args) => starte(id, Array.isArray(args) ? args.filter((x) => typeof x === 'string').slice(0, 4) : []));
  ipcMain.handle('einst', () => einst());
  ipcMain.handle('updates', () => pruefeUpdates());
  const laeuft = new Set();
  ipcMain.handle('update:laden', async (e, id) => {
    if (!PRAEFIX[id]) return { fehler: 'Unbekannt.' };
    if (laeuft.has(id)) return { fehler: 'Läuft schon.' };
    laeuft.add(id);
    try { return await ladeUndInstalliere(id, e.sender); } catch (f) { return { fehler: f.message || 'Download klappt nicht.' }; } finally { laeuft.delete(id); }
  });
  ipcMain.handle('version', () => app.getVersion());
  ipcMain.handle('claude:status', () => Claude.status());
  ipcMain.handle('claude:laden', async (e) => { try { return { ok: true, version: await Claude.laden((u, o) => net.fetch(u, { ...(o || {}), headers: { 'User-Agent': 'Selbst-gfaltet' } }), (pct) => e.sender.send('claude:fortschritt', pct)) }; } catch (f) { return { fehler: f.message }; } });
  ipcMain.handle('claude:token', (_e, t) => Claude.setzeToken(t));
  ipcMain.handle('claude:abmelden', () => Claude.abmelden());
  ipcMain.handle('claude:anmeldenFenster', () => Claude.anmeldenFenster());
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
