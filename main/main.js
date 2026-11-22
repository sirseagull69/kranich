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
  if (process.platform === 'win32') defender = new kern.Defender();

  const dienste = erstelleDienste({
    kern,
    einstellungen,
    defender,
    plattform: process.platform,
    heimOrdner: os.homedir(),
    datenOrdner,
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
    const antwort = await dialog.showOpenDialog(fenster, { properties: [art === 'ordner' ? 'openDirectory' : 'openFile'] });
    return antwort.canceled ? null : antwort.filePaths[0];
  });
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
      { label: 'Beenden', click: () => { wirklichBeenden = true; app.quit(); } },
    ]);
  tray.setContextMenu(menue());
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
