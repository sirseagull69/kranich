'use strict';
// Hauptprozess von Kranich: Fenster, Tray, Benachrichtigungen. Die
// eigentliche Arbeit steckt in dienste.js und im Kern.

const path = require('node:path');
const os = require('node:os');
const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, dialog, safeStorage, nativeImage, shell } = require('electron');
const kern = require('../kern');
const { erstelleEinstellungen } = require('./einstellungen');
const { erstelleDienste, FUER_OBERFLAECHE } = require('./dienste');

let fenster = null;
let tray = null;
let wirklichBeenden = false;

// Kranich laeuft nur einmal. Ein zweiter Start holt das Fenster nach vorn.
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
    verschluessle: (text) => (safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(text).toString('base64') : null),
    entschluessle: (geheim) => safeStorage.decryptString(Buffer.from(geheim, 'base64')),
  });

  let defender = null;
  let leseAutostart = null;
  if (process.platform === 'win32') defender = new kern.Defender();
  // Nur fuer die Entwicklung: spielt einen Windows-Schutz vor, damit sich die
  // Oberflaeche auch ohne Windows ansehen laesst. In der installierten App aus.
  if (!app.isPackaged && process.env.KRANICH_SPIELDATEN) {
    ({ defender, leseAutostart } = require('../werkzeug/spieldaten')(process.env.KRANICH_SPIELDATEN));
  }

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
      fenster?.webContents.send('kranich:ereignis', ereignis);
      benachrichtige(ereignis, einstellungen.lese().benachrichtigungen);
      if (ereignis.art === 'einstellungen') uebernimmSystemstart(ereignis.einstellungen);
    },
  });

  // Die Oberflaeche darf genau die Dienste aus der Liste aufrufen.
  for (const name of FUER_OBERFLAECHE) {
    ipcMain.handle(`kranich:${name}`, async (_ereignis, ...werte) => {
      try {
        return await dienste[name](...werte);
      } catch (fehler) {
        return { ok: false, grund: fehler.message };
      }
    });
  }
  ipcMain.handle('kranich:waehlePfad', async (_e, art) => {
    if (art === 'frage') {
      const wahl = await dialog.showMessageBox(fenster, {
        type: 'question', title: 'Kranich', message: 'Was soll Kranich prüfen?',
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

  uebernimmSystemstart(einstellungen.lese());
  baueTray(dienste);
  baueFenster(einstellungen);
  dienste.starte();

  app.on('before-quit', () => {
    wirklichBeenden = true;
    dienste.beende();
  });
}

function baueFenster(einstellungen) {
  fenster = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#f6f1e7',
    title: 'Kranich',
    show: !process.argv.includes('--versteckt'), // beim Systemstart nur ins Tray
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  fenster.loadFile(path.join(__dirname, '..', 'ui', 'index.html'));
  // Die Oberflaeche ist lokal. Links nach draussen oeffnet der Browser.
  fenster.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  fenster.webContents.on('will-navigate', (ereignis) => ereignis.preventDefault());
  // Fenster zu heisst nicht aus, wenn "Im Tray weiterlaufen" an ist.
  fenster.on('close', (ereignis) => {
    if (!wirklichBeenden && einstellungen.lese().imTrayWeiterlaufen) {
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

function baueTray(dienste) {
  const bild = nativeImage.createFromPath(path.join(__dirname, '..', 'bau', 'tray.png'));
  tray = new Tray(bild);
  tray.setToolTip('Kranich');
  tray.on('click', zeigeFenster);
  const menue = () =>
    Menu.buildFromTemplate([
      { label: 'Kranich öffnen', click: zeigeFenster },
      { type: 'separator' },
      { label: 'Jetzt scannen', enabled: process.platform === 'win32', click: () => dienste.schutzScan('schnell').catch(() => {}) },
      dienste.wacheStatus().an
        ? { label: 'Download-Wache pausieren', click: () => { dienste.einstellungenSetzen({ wacheAn: false }); tray.setContextMenu(menue()); } }
        : { label: 'Download-Wache fortsetzen', click: () => { dienste.einstellungenSetzen({ wacheAn: true }); tray.setContextMenu(menue()); } },
      { type: 'separator' },
      { label: 'Probealarm', click: () => probealarm(dienste) },
      { label: 'Testpaket prüfen', click: () => testpaket(dienste) },
      { type: 'separator' },
      { label: 'Beenden', click: () => { wirklichBeenden = true; app.quit(); } },
    ]);
  tray.setContextMenu(menue());
}

// Beide Tests aus dem Tray-Menue zeigen ihr Ergebnis in einem Fenster.
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
  zeigeFenster();
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
  if (ereignis.art === 'schutzscan-fertig' && erlaubt.scanFertig) {
    inhalt = { title: 'Kranich · Scan fertig', body: ereignis.neueFunde ? `${ereignis.neueFunde} neue Funde.` : 'Nichts gefunden.' };
  }
  if (!inhalt) return;
  const meldung = new Notification(inhalt);
  meldung.on('click', zeigeFenster);
  meldung.show();
}

app.on('window-all-closed', () => {
  // Kranich bleibt im Tray. Beendet wird nur ueber das Tray-Menue.
});
