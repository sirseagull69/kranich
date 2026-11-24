'use strict';
// Specht – Hauptprozess: Fenster, Speicher + Sync, Abklopfen, Claude.
// Specht ändert nie etwas an Systemen: er pingt, liest und zeigt an.
const { app, BrowserWindow, ipcMain, shell, safeStorage, Notification, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { Einstellungen } = require('../kern/einstellungen');
const { Speicher, anmelden, registrieren, erneuern } = require('../kern/speicher');
const { klopfeAlle } = require('../kern/klopfen');
const W = require('../kern/wissen');
const grund = () => { const g = speicher?.hole('wissen-grund'); return g && Array.isArray(g.SERVER) ? g : W.LEER; };
const H = require('../kern/helfer');
const Hirn = require('../kern/hirn');
const Eingebaut = require('../kern/eingebaut');

// Sync-Dienst (Supabase-Projekt der Familie). Der Schlüssel ist öffentlich gedacht –
// jeder sieht dank RLS nur seine eigenen Einträge, und nur nach Anmeldung.
const SYNC = {
  url: process.env.SPECHT_SYNC_URL || 'https://kfisewkojhijwvqlyyca.supabase.co',
  schluessel: process.env.SPECHT_SYNC_SCHLUESSEL || 'sb_publishable_SjAOzcos6mU-nLOiRNONZQ_uCKRC16B',
};
const SPIEL = Boolean(process.env.SPECHT_SPIEL); // Tests: kein Claude, kein echtes Ping, kein Sync

let fenster = null;
let einstellungen = null;
let speicher = null;
let zustand = {}; // letzte Klopf-Ergebnisse
let letzterKlopf = null;
let klopfUhr = null;
let syncUhr = null;
let syncStatus = { art: 'aus', text: 'Nicht angemeldet', wartend: 0, konflikte: 0 };
let konto = null; // { email, token, refresh, ablauf }

const geraet = () => {
  const h = os.hostname();
  if (/^NB-/i.test(h)) return `Arbeits-Notebook (${h})`;
  return h;
};

function handle(name, fn) {
  ipcMain.handle(name, async (_e, ...args) => {
    try { return await fn(...args); } catch (f) { return { fehler: { art: f.art || 'fehler', nachricht: f.message || String(f), details: f.details || '' } }; }
  });
}
const sende = (kanal, daten) => { if (fenster && !fenster.isDestroyed()) fenster.webContents.send(kanal, daten); };

// ---------- Konto (verschlüsselt auf der Platte) ----------
const kontoDatei = () => path.join(app.getPath('userData'), 'konto.bin');
function kontoLaden() {
  try {
    const roh = fs.readFileSync(kontoDatei());
    const text = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(roh) : roh.toString('utf8');
    konto = JSON.parse(text);
  } catch { konto = null; }
}
function kontoSichern() {
  if (!konto) { fs.rmSync(kontoDatei(), { force: true }); return; }
  const text = JSON.stringify(konto);
  fs.writeFileSync(kontoDatei(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(text) : Buffer.from(text, 'utf8'));
}
function kontoAus(d, email) {
  return { email: d.user?.email || email, token: d.access_token, refresh: d.refresh_token, ablauf: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
}
async function frischesToken() {
  if (!konto) return null;
  if (Date.now() < konto.ablauf - 120000) return konto.token;
  const d = await erneuern(SYNC, konto.refresh);
  konto = kontoAus(d, konto.email);
  kontoSichern();
  return konto.token;
}

// ---------- Sync ----------
let syncLaeuft = false;
let syncNochmal = false;
async function syncJetzt() {
  if (SPIEL || !konto) { syncStatus = { art: konto ? 'synchron' : 'aus', text: konto ? 'Synchron' : 'Nicht angemeldet', wartend: speicher.wartend(), konflikte: speicher.konflikte().length }; sende('sync:status', syncStatus); return syncStatus; }
  if (syncLaeuft) { syncNochmal = true; return syncStatus; }
  syncLaeuft = true;
  syncStatus = { ...syncStatus, art: 'laeuft', text: 'Synchronisiert …' }; sende('sync:status', syncStatus);
  try {
    let token = await frischesToken();
    let r;
    try { r = await speicher.sync({ ...SYNC, token }); } catch (f) {
      if (f.art !== 'nicht-angemeldet') throw f;
      konto.ablauf = 0; token = await frischesToken();
      r = await speicher.sync({ ...SYNC, token });
    }
    syncStatus = r.konflikte
      ? { art: 'konflikt', text: 'Zwei Versionen', wartend: r.wartend, konflikte: r.konflikte }
      : { art: 'synchron', text: 'Synchron', wartend: r.wartend, konflikte: 0, zeit: new Date().toISOString() };
    if (r.geholt) sende('daten:neu', { eintraege: speicher.alle() });
  } catch (f) {
    const wartend = speicher.wartend();
    syncStatus = f.art === 'offline'
      ? { art: 'offline', text: wartend ? `Offline – ${wartend} ${wartend === 1 ? 'Änderung wartet' : 'Änderungen warten'}` : 'Offline', wartend, konflikte: speicher.konflikte().length }
      : f.art === 'falsch' || f.art === 'nicht-angemeldet'
        ? { art: 'problem', text: 'Bitte neu anmelden', wartend, konflikte: 0 }
        : { art: 'problem', text: 'Sync-Problem', detail: f.message, wartend, konflikte: 0 };
  } finally {
    syncLaeuft = false;
    sende('sync:status', syncStatus);
    if (syncNochmal) { syncNochmal = false; setTimeout(syncJetzt, 500); }
  }
  return syncStatus;
}
let syncBald = null;
const syncSpaeter = () => { clearTimeout(syncBald); syncBald = setTimeout(syncJetzt, 1500); };

// ---------- Abklopfen ----------
function ziele() {
  const g = grund(); return [...g.SERVER.map((s) => ({ id: s.id, ip: s.ip })), ...g.NETZ.map((n) => ({ id: n.id, ip: n.ip }))];
}
async function klopfen() {
  const vorher = zustand;
  sende('klopfen:start', {});
  if (SPIEL) {
    const still = new Set(['nas02', 'nas03', 'alt01']);
    zustand = Object.fromEntries(ziele().map((z) => [z.id, { ip: z.ip, an: !still.has(z.id), ms: still.has(z.id) ? null : 2, zeit: new Date().toISOString() }]));
  } else {
    zustand = await klopfeAlle(ziele());
  }
  letzterKlopf = new Date().toISOString();
  sende('klopfen:neu', { zustand, zeit: letzterKlopf });
  // Taskleiste: nur wenn etwas NEU nicht antwortet (und nicht „gewollt aus“)
  const aus = new Set(speicher.alle('gewollt_aus').map((g) => g.ziel));
  const neuRot = Object.entries(zustand).filter(([id, z]) => !z.an && vorher[id]?.an && !aus.has(id));
  if (neuRot.length && einstellungen.alle().meldungenAn && Notification.isSupported() && !SPIEL) {
    const g = grund(); const namen = neuRot.map(([id]) => (g.SERVER.find((s) => s.id === id) || g.NETZ.find((n) => n.id === id))?.name || id);
    new Notification({ title: 'Specht: bitte ansehen', body: `${namen.slice(0, 3).join(', ')}${namen.length > 3 ? ` und ${namen.length - 3} weitere` : ''} ${namen.length === 1 ? 'antwortet' : 'antworten'} gerade nicht.`, silent: true }).show();
  }
  return { zustand, zeit: letzterKlopf };
}
function klopfUhrStellen() {
  clearInterval(klopfUhr);
  const e = einstellungen.alle();
  if (!e.autoKlopfen) return;
  klopfUhr = setInterval(() => klopfen().catch(() => {}), Math.max(1, Number(e.intervallMin) || 5) * 60000);
}

// ---------- Lizenzen (nur lesen, aus Nils' Lizenz-Tool) ----------
async function lizenzenLesen() {
  const e = einstellungen.alle();
  if (!e.lizenzUrl || !e.lizenzSchluessel) return { verbunden: false, liste: [] };
  const url = `${e.lizenzUrl.replace(/\/+$/, '')}/rest/v1/lizenzen?select=*`;
  const r = await fetch(url, { headers: { apikey: e.lizenzSchluessel, authorization: `Bearer ${e.lizenzSchluessel}` } });
  if (!r.ok) throw Object.assign(new Error(`Lizenz-Tool antwortet mit Fehler ${r.status}.`), { art: 'lizenzen' });
  const liste = await r.json();
  // Lizenzschlüssel nie anzeigen
  return { verbunden: true, liste: liste.map((l) => { const x = { ...l }; for (const k of Object.keys(x)) if (/schl(ue|ü)ssel|key|logo/i.test(k)) delete x[k]; return x; }) };
}

// ---------- Claude ----------
// Angehängte Dateien: Bilder gehen als Bild an Claude, Text-/Logdateien als Auszug in die Frage
function anhaengeLesen(anhaenge) {
  const bilder = []; let extra = '';
  for (const a of (Array.isArray(anhaenge) ? anhaenge : []).slice(0, 4)) {
    const p = String(a?.pfad || ''); if (!p || !fs.existsSync(p)) continue;
    const groesse = fs.statSync(p).size;
    if (/\.(png|jpe?g|webp|gif)$/i.test(p) && groesse < 15e6) bilder.push(p);
    else if (/\.(txt|log|csv|json|xml|ini|cfg|conf|ps1|bat|cmd|reg|md|ya?ml|html?|err|out)$/i.test(p) && groesse < 50e6) {
      const fd = fs.openSync(p, 'r'); const n = Math.min(groesse, 60000); const buf = Buffer.alloc(n); fs.readSync(fd, buf, 0, n, groesse - n); fs.closeSync(fd);
      extra += `\n\nAngehängte Datei „${path.basename(p)}“ (${groesse > n ? 'die letzten 60 KB' : 'vollständig'}):\n\`\`\`\n${buf.toString('utf8')}\n\`\`\``;
    }
  }
  return { bilder, extra };
}

async function frage(text, verlauf, anhaenge) {
  const an = anhaengeLesen(anhaenge);
  const wissen = {
    grund: grund(),
    notizen: speicher.alle('notiz'), stoerungen: speicher.alle('stoerung'), anleitungen: speicher.alle('anleitung'),
    gewolltAus: speicher.alle('gewollt_aus').map((g) => g.ziel), zustand,
    netzOffen: speicher.alle('netzpunkt').filter((p) => !p.erledigt).map((p) => p.text),
  };
  if (SPIEL) {
    const st = speicher.alle('stoerung')[0]; const an = speicher.alle('anleitung')[0];
    return { antwort: 'Spiel-Antwort: Das läuft auf dem genannten Server. Das Kennwort liegt in Passbolt.', befehle: [{ zweck: 'Prüfen, ob der Dienst läuft', befehl: 'sc query dienst' }], aehnlich: st ? [st.id] : [], anleitung: an ? an.id : '', weg: 'spiel' };
  }
  const { text: roh, weg } = await Hirn.frage({ system: H.SYSTEM, auftrag: H.auftrag({ frage: text + (an.bilder.length ? `\n\n(${an.bilder.length} Bildschirmfoto${an.bilder.length > 1 ? 's' : ''} angehängt – schau sie dir genau an.)` : '') + an.extra, verlauf, ...wissen }), bilder: an.bilder }, einstellungen.alle(), { zeitlimitMs: 240000 });
  return { ...H.leseAntwort(roh), weg };
}

// ---------- Stand-Fotos (für Kranich) ----------
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
  handle('start:daten', () => ({
    wissen: grund(),
    eintraege: speicher.alle(),
    konflikte: speicher.konflikte(),
    konto: konto ? { email: konto.email } : null,
    erstStart: !konto && !einstellungen.alle().erstStartFertig,
    sync: syncStatus,
    zustand, letzterKlopf,
    geraet: geraet(),
    version: app.getVersion(),
    einstellungen: { ...einstellungen.fuerOberflaeche(), eingebaut: Eingebaut.status() },
  }));
  handle('wissen:laden', async () => {
    let datei = process.env.SPECHT_WISSEN_DATEI;
    if (!datei) {
      const r = await dialog.showOpenDialog(fenster, { title: 'Wissens-Datei laden', filters: [{ name: 'Specht-Wissen', extensions: ['json'] }], properties: ['openFile'] });
      if (r.canceled || !r.filePaths[0]) return { abgebrochen: true };
      datei = r.filePaths[0];
    }
    const w = W.pruefe(fs.readFileSync(datei, 'utf8'));
    speicher.setze('wissen', 'wissen-grund', w.grund);
    // Tagebuch, Anleitungen, Netzpunkte nur ergänzen – Vorhandenes bleibt
    const da = (id) => Boolean(speicher.hole(id));
    let neu = 0;
    for (const x of w.stoerungen) if (x && x.id && !da(x.id)) { speicher.setze('stoerung', String(x.id), { datum: x.datum, was: x.was, ursache: x.ursache, loesung: x.loesung, status: x.status === 'offen' ? 'offen' : 'erledigt', server: x.server || [] }); neu++; }
    for (const x of w.anleitungen) if (x && x.id && !da(x.id)) { speicher.setze('anleitung', String(x.id), { titel: x.titel, untertitel: x.untertitel || '', schritte: (x.schritte || []).map(String) }); neu++; }
    w.netzOffen.forEach((t, i) => { if (!da(`np-${i + 1}`)) speicher.setze('netzpunkt', `np-${i + 1}`, { text: t, erledigt: false }); });
    for (const g of w.gewolltAus) if (!da(`ga-${g}`)) speicher.setze('gewollt_aus', `ga-${g}`, { ziel: g });
    syncSpaeter();
    if (einstellungen.alle().autoKlopfen) setTimeout(() => klopfen().catch(() => {}), 200);
    return { ok: true, server: w.grund.SERVER.length, neu, wissen: grund(), eintraege: speicher.alle() };
  });
  handle('eintrag:setze', (art, id, daten) => { const r = speicher.setze(art, id, daten); syncSpaeter(); return r; });
  handle('eintrag:loesche', (id) => { const r = speicher.loesche(id); syncSpaeter(); return r; });
  handle('konflikt:loese', (id, wahl) => { speicher.loese(id, wahl); syncSpaeter(); return { eintraege: speicher.alle(), konflikte: speicher.konflikte() }; });
  handle('konto:anmelden', async (email, kennwort) => {
    if (SPIEL) { konto = { email, token: 'spiel', refresh: 'spiel', ablauf: Date.now() + 3600000 }; syncJetzt(); return { email }; }
    const d = await anmelden(SYNC, String(email).trim(), String(kennwort));
    konto = kontoAus(d, email); kontoSichern(); syncJetzt();
    return { email: konto.email };
  });
  handle('konto:registrieren', async (email, kennwort) => {
    if (SPIEL) return { bestaetigen: true };
    const d = await registrieren(SYNC, String(email).trim(), String(kennwort));
    if (d.access_token) { konto = kontoAus(d, email); kontoSichern(); syncJetzt(); return { email: konto.email }; }
    return { bestaetigen: true };
  });
  handle('konto:abmelden', () => { konto = null; kontoSichern(); syncJetzt(); return true; });
  handle('sync:jetzt', () => syncJetzt());
  handle('klopfen:jetzt', () => klopfen());
  handle('frage', (text, verlauf, anhaenge) => frage(String(text), Array.isArray(verlauf) ? verlauf : [], anhaenge));
  // Eingefügtes Bildschirmfoto (Strg+V) als Datei ablegen
  handle('anhang:speichern', (dataUrl) => {
    const m = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(String(dataUrl || '')); if (!m) throw new Error('Kein Bild.');
    const ordner = path.join(os.tmpdir(), 'specht-anhaenge'); fs.mkdirSync(ordner, { recursive: true });
    const datei = path.join(ordner, `bildschirmfoto-${Date.now()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`);
    fs.writeFileSync(datei, Buffer.from(m[2], 'base64')); return { pfad: datei, name: 'Bildschirmfoto' };
  });
  handle('lizenzen', () => lizenzenLesen());
  handle('rdp', (ip) => {
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(String(ip))) throw new Error('Keine gültige IP.');
    if (process.platform !== 'win32') throw new Error('RDP öffnen geht nur unter Windows.');
    spawn('mstsc', [`/v:${ip}`], { detached: true, stdio: 'ignore' }).unref();
    return true;
  });
  handle('stand:foto', (name) => standFoto(String(name)));
  handle('einstellungen:setzen', (neu) => { const r = einstellungen.setze(neu); klopfUhrStellen(); return { ...r, eingebaut: Eingebaut.status() }; });
  handle('hirn:testen', async () => {
    if (SPIEL) return { ok: true, weg: 'spiel' };
    const { text, weg } = await Hirn.frage({ system: 'Antworte nur mit dem Wort OK.', auftrag: 'Bist du da?' }, einstellungen.alle(), { schnell: true });
    return { ok: /ok/i.test(text), weg };
  });
  handle('link', (url) => { if (/^https:\/\//.test(String(url))) shell.openExternal(String(url)); return true; });
}

function oeffneFenster() {
  fenster = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700, title: 'Specht', backgroundColor: '#b23a28', autoHideMenuBar: true,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#b23a28', symbolColor: '#ffffff', height: 46 },
    icon: path.join(__dirname, '..', 'bau', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  fenster.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  fenster.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  fenster.webContents.on('will-navigate', (e) => e.preventDefault());
}

function start() {
  const daten = app.getPath('userData');
  try { fs.mkdirSync(daten, { recursive: true }); fs.writeFileSync(path.join(daten, 'version.json'), JSON.stringify({ version: app.getVersion(), pfad: process.execPath })); } catch { /* egal */ }
  einstellungen = new Einstellungen(path.join(daten, 'einstellungen.json'));
  speicher = new Speicher(path.join(daten, 'specht-daten.json'), { geraet: geraet() });
  kontoLaden();
  registriere();
  oeffneFenster();
  klopfUhrStellen();
  if (SPIEL || einstellungen.alle().autoKlopfen) setTimeout(() => klopfen().catch(() => {}), SPIEL ? 300 : 1500);
  syncJetzt();
  syncUhr = setInterval(syncJetzt, 60000);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (!fenster) return; if (fenster.isMinimized()) fenster.restore(); fenster.focus(); });
  app.whenReady().then(start);
  app.on('window-all-closed', () => { clearInterval(klopfUhr); clearInterval(syncUhr); app.quit(); });
}
