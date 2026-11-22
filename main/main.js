'use strict';
// Hauptprozess von Kranich. Aus diesem Quelltext entstehen zwei getrennte
// Programme:
//
//   Kranich Agent  laeuft im Tray auf jedem Geraet, bewacht es und meldet
//                  an die Zentrale. Kleines Statusfenster.
//   Kranich Host   das grosse Fenster: anmelden, alle Geraete sehen,
//                  Auftraege senden. Kein Tray, kein Hintergrunddienst.
//
// Welche Rolle laeuft, steht im Installer (package.json: kranichRolle) oder
// fuer die Entwicklung in KRANICH_ROLLE. Die eigentliche Arbeit steckt in
// dienste.js, verbund.js und im Kern.

const path = require('node:path');
const os = require('node:os');
const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, dialog, safeStorage, nativeImage, shell } = require('electron');
const kern = require('../kern');
const { erstelleEinstellungen } = require('./einstellungen');
const { erstelleDienste, FUER_OBERFLAECHE } = require('./dienste');
const { erstelleVerbund, VERBUND_FUER_OBERFLAECHE } = require('./verbund');
const zugang = require('../zentrale/zugang.json');

const ROLLE = (!app.isPackaged && process.env.KRANICH_ROLLE) || require('../package.json').kranichRolle || 'host';
const AGENT = ROLLE === 'agent';
const SPIEL = !app.isPackaged && Boolean(process.env.KRANICH_SPIELZENTRALE);
const TITEL = AGENT ? 'Kranich Agent' : 'Kranich Host';
// Jedes Programm hat seinen eigenen Datenordner. Der Host behaelt den Ordner
// der bisherigen App, damit Verlauf und Quarantaene erhalten bleiben.
const ORDNER = { agent: 'Kranich Agent', host: 'Kranich' };
if (!process.env.KRANICH_DATEN_FEST) app.setPath('userData', path.join(app.getPath('appData'), ORDNER[AGENT ? 'agent' : 'host']));

let fenster = null;
let tray = null;
let wirklichBeenden = false;

// Jedes Programm laeuft nur einmal. Ein zweiter Start holt das Fenster nach vorn.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', zeigeFenster);
  app.whenReady().then(start);
}

function start() {
  const datenOrdner = app.getPath('userData');
  const einstellungen = erstelleEinstellungen({
    datei: path.join(datenOrdner, 'einstellungen.json'),
    // Ohne Schluesselspeicher wird nichts Geheimes gespeichert. Einzige
    // Ausnahme: der Test mit vorgespielter Zentrale, dort gibt es kein echtes Geheimnis.
    verschluessle: (text) => (safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(text).toString('base64') : (SPIEL ? `spiel:${Buffer.from(text).toString('base64')}` : null)),
    entschluessle: (geheim) => (SPIEL && geheim.startsWith('spiel:') ? Buffer.from(geheim.slice(6), 'base64').toString() : safeStorage.decryptString(Buffer.from(geheim, 'base64'))),
  });

  let defender = null;
  let leseAutostart = null;
  let netz = globalThis.fetch;
  if (process.platform === 'win32') defender = new kern.Defender();
  // Nur fuer die Entwicklung: spielt einen Windows-Schutz und eine Zentrale
  // vor, damit sich die Oberflaeche auch ohne Windows und ohne Netz ansehen
  // laesst. In der installierten App aus.
  if (!app.isPackaged && process.env.KRANICH_SPIELDATEN) {
    ({ defender, leseAutostart } = require('../werkzeug/spieldaten')(process.env.KRANICH_SPIELDATEN));
  }
  if (SPIEL) netz = require('../werkzeug/spielzentrale')(process.env.KRANICH_SPIELZENTRALE);

  const anFenster = (ereignis) => fenster?.webContents.send('kranich:ereignis', ereignis);
  let verbund = null;
  const dienste = erstelleDienste({
    kern,
    einstellungen,
    defender,
    plattform: process.platform,
    heimOrdner: os.homedir(),
    datenOrdner,
    leseAutostart,
    rechnerName: os.hostname(),
    schreibtisch: app.getPath('desktop'),
    version: app.getVersion(),
    melde: (ereignis) => {
      anFenster(ereignis);
      if (!AGENT) return; // Benachrichtigen und Melden ist Sache des Agents
      benachrichtige(ereignis, einstellungen.lese().benachrichtigungen);
      if (ereignis.art === 'einstellungen') { uebernimmSystemstart(ereignis.einstellungen); frischeTray(); }
      // Nach einem Scan oder Fund gleich an die Zentrale melden.
      if (ereignis.art === 'schutzscan-start' || ereignis.art === 'schutzscan-fertig' || ereignis.art === 'verlauf') verbund?.agentJetzt().catch(() => {});
      if (ereignis.art === 'schutzscan-start' || ereignis.art === 'schutzscan-fertig') frischeTray();
    },
  });

  // Verbindung zur Zentrale: der Agent meldet, der Host meldet sich mit dem Konto an.
  verbund = erstelleVerbund({
    kern, einstellungen, zugang, defender, leseAutostart, fetch: netz,
    plattform: process.platform, datenOrdner, version: app.getVersion(),
    scanLaeuft: () => Boolean(dienste.schutzScanStatus().laeuft),
    nachbarAgentDatei: AGENT ? null : path.join(app.getPath('appData'), ORDNER.agent, 'agent.json'),
    melde: (ereignis) => { anFenster(ereignis); if (AGENT) frischeTray(); },
  });

  // Die Oberflaeche darf genau die Dienste aus den Listen aufrufen.
  const reiche = (namen, ziel) => {
    for (const name of namen) {
      ipcMain.handle(`kranich:${name}`, async (_ereignis, ...werte) => {
        try {
          return await ziel[name](...werte);
        } catch (fehler) {
          return { ok: false, grund: fehler.message };
        }
      });
    }
  };
  reiche(FUER_OBERFLAECHE, dienste);
  reiche(VERBUND_FUER_OBERFLAECHE, verbund);
  ipcMain.handle('kranich:waehlePfad', async (_e, art) => {
    if (art === 'frage') {
      const wahl = await dialog.showMessageBox(fenster, {
        type: 'question', title: TITEL, message: 'Was soll Kranich prüfen?',
        buttons: ['Eine Datei', 'Einen Ordner', 'Abbrechen'], defaultId: 0, cancelId: 2, noLink: true,
      });
      if (wahl.response === 2) return null;
      art = wahl.response === 1 ? 'ordner' : 'datei';
    }
    const antwort = await dialog.showOpenDialog(fenster, { properties: [art === 'ordner' ? 'openDirectory' : 'openFile'] });
    return antwort.canceled ? null : antwort.filePaths[0];
  });
  // Oeffnet die Windows-Sicherheit auf der Seite fuer den Virenschutz.
  ipcMain.handle('kranich:oeffneSchutz', () => (process.platform === 'win32' ? shell.openExternal('windowsdefender://threat') : undefined));
  ipcMain.handle('kranich:zeigeImOrdner', (_e, pfad) => (typeof pfad === 'string' ? shell.showItemInFolder(pfad) : undefined));

  if (AGENT) {
    uebernimmSystemstart(einstellungen.lese());
    baueTray(dienste, verbund);
    verbund.starte();
  } else if (app.isPackaged) {
    // Der Host startet nicht mit dem System. Raeumt auch den Eintrag der
    // frueheren App weg, die noch beides in einem war.
    app.setLoginItemSettings({ openAtLogin: false });
  }
  baueFenster(einstellungen);
  dienste.starte();

  app.on('before-quit', () => {
    wirklichBeenden = true;
    verbund.beende();
    dienste.beende();
  });
}

function baueFenster(einstellungen) {
  const mass = AGENT
    ? { width: 360, height: 480, useContentSize: true, resizable: false, maximizable: false, fullscreenable: false }
    : { width: 1360, height: 900, minWidth: 980, minHeight: 640 };
  fenster = new BrowserWindow({
    ...mass,
    backgroundColor: AGENT ? '#fffdf8' : '#f6f1e7',
    title: TITEL,
    show: !process.argv.includes('--versteckt'), // beim Systemstart nur ins Tray
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  fenster.loadFile(path.join(__dirname, '..', 'ui', AGENT ? 'agent.html' : 'index.html'));
  // Die Oberflaeche ist lokal. Links nach draussen oeffnet der Browser.
  fenster.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  fenster.webContents.on('will-navigate', (ereignis) => ereignis.preventDefault());
  // Beim Agent heisst Fenster zu nicht aus: er laeuft im Tray weiter.
  fenster.on('close', (ereignis) => {
    if (AGENT && !wirklichBeenden && einstellungen.lese().imTrayWeiterlaufen) {
      ereignis.preventDefault();
      fenster.hide();
    }
  });
}

function zeigeFenster() {
  if (!fenster) return;
  if (fenster.isMinimized()) fenster.restore();
  fenster.show();
  fenster.focus();
}

// Das Tray-Menue des Agents. Die erste Zeile sagt, wie es dem Geraet geht.
let frischeTray = () => {};
function baueTray(dienste, verbund) {
  const bild = nativeImage.createFromPath(path.join(__dirname, '..', 'bau', 'tray.png'));
  tray = new Tray(bild);
  tray.on('click', zeigeFenster);
  const menue = () => {
    const a = verbund.agentStatus();
    const laeuft = dienste.schutzScanStatus().laeuft;
    const name = a.name || dienste.info().name;
    const zeile = `${name} · ${!a.gekoppelt ? 'nicht gekoppelt' : (a.verbunden === false ? 'keine Verbindung zum Host' : 'mit Host verbunden')}`;
    tray.setToolTip(`${TITEL} · ${laeuft ? 'Scan läuft' : zeile}`);
    return Menu.buildFromTemplate([
      { label: laeuft ? (laeuft === 'voll' ? 'Vollscan läuft' : 'Schnellscan läuft') : 'Kranich wacht', enabled: false },
      { label: zeile, enabled: false },
      { type: 'separator' },
      { label: 'Jetzt scannen', enabled: process.platform === 'win32' && !laeuft, click: () => dienste.schutzScan('schnell').catch(() => {}) },
      dienste.wacheStatus().an
        ? { label: 'Download-Wache pausieren', click: () => dienste.einstellungenSetzen({ wacheAn: false }) }
        : { label: 'Download-Wache fortsetzen', click: () => dienste.einstellungenSetzen({ wacheAn: true }) },
      { label: 'Probealarm', click: () => probealarm(dienste) },
      { label: 'Testpaket prüfen', click: () => testpaket(dienste) },
      { label: 'Statusfenster öffnen', click: zeigeFenster },
      { type: 'separator' },
      { label: 'Beenden', click: () => { wirklichBeenden = true; app.quit(); } },
    ]);
  };
  frischeTray = () => { if (tray && !tray.isDestroyed()) tray.setContextMenu(menue()); };
  frischeTray();
}

// Der Probealarm aus dem Tray-Menue zeigt sein Ergebnis in einem Fenster.
async function probealarm(dienste) {
  const e = await dienste.probealarm().catch((fehler) => ({ ok: false, grund: fehler.message }));
  fenster?.webContents.send('kranich:ereignis', { art: 'verlauf-probe' });
  const text = !e.ok ? `Das hat nicht geklappt: ${e.grund}`
    : (e.durch === 'kranich' ? 'Kranich hat die Testdatei erkannt. Die Engine funktioniert.'
      : 'Der Schutz des Systems war schneller und hat die Testdatei abgefangen. Auch das zeigt: Der Schutz funktioniert.');
  dialog.showMessageBox({ type: e.ok ? 'info' : 'warning', title: 'Kranich · Probealarm', message: text, buttons: ['Gut'] });
}

async function testpaket(dienste) {
  const e = await dienste.testpaket().catch((fehler) => ({ ok: false, grund: fehler.message }));
  if (!e.ok) return dialog.showMessageBox({ type: 'warning', title: 'Kranich · Testpaket', message: `Das hat nicht geklappt: ${e.grund}`, buttons: ['Gut'] });
  const WORT = { verdaechtig: 'verdächtig', schaedlich: 'schädlich', unauffaellig: 'unauffällig', nicht_geprueft: 'nicht geprüft', ruhig: 'unauffällig' };
  const zeilen = e.zeilen.map((z) => `${z.bestanden ? '✓' : '✗'}  ${z.datei}: ${WORT[z.urteil] || z.urteil}${z.bestanden ? '' : ` (erwartet: ${WORT[z.erwartet] || z.erwartet})`}`);
  return dialog.showMessageBox({
    type: e.bestanden === e.gesamt ? 'info' : 'warning', title: 'Kranich · Testpaket',
    message: `${e.bestanden} von ${e.gesamt} Dateien wie erwartet`,
    detail: `${zeilen.join('\n')}\n\nDie Dateien liegen in:\n${e.ordner}\nSie sind harmlos und können gelöscht werden.`, buttons: ['Gut'],
  });
}

function uebernimmSystemstart(einstellungen) {
  if (!app.isPackaged) return; // nur in der installierten App
  app.setLoginItemSettings({ openAtLogin: einstellungen.mitSystemStarten, args: ['--versteckt'] });
}

function benachrichtige(ereignis, erlaubt) {
  if (!Notification.isSupported()) return;
  let inhalt = null;
  if (ereignis.art === 'download') {
    const e = ereignis.eintrag;
    if (e.urteil === 'schaedlich' && erlaubt.fund) inhalt = { title: 'Kranich · Fund', body: `${e.name} ist schädlich. ${e.hinweise[0] ?? ''}`.trim() };
    if (e.urteil === 'verdaechtig' && erlaubt.warnung) inhalt = { title: 'Kranich · Warnung', body: `${e.name} sieht verdächtig aus. ${e.hinweise[0] ?? ''}`.trim() };
  }
  if (ereignis.art === 'schutzscan-fertig' && ereignis.ok && erlaubt.scanFertig) {
    inhalt = { title: 'Kranich · Scan fertig', body: ereignis.neueFunde ? `${ereignis.neueFunde} neue Funde.` : 'Nichts gefunden.' };
  }
  if (!inhalt) return;
  const meldung = new Notification(inhalt);
  meldung.on('click', zeigeFenster);
  meldung.show();
}

app.on('window-all-closed', () => {
  // Der Agent bleibt im Tray. Der Host ist zu, wenn sein Fenster zu ist.
  if (!AGENT) app.quit();
});
