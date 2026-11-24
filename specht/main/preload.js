'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const rufe = (k) => (...a) => ipcRenderer.invoke(k, ...a);
const hoere = (k) => (cb) => ipcRenderer.on(k, (_e, d) => cb(d));
contextBridge.exposeInMainWorld('SP', {
  ori: { frage: (an, typ, extra) => ipcRenderer.invoke('ori:frage', an, typ, extra), apps: () => ipcRenderer.invoke('ori:apps') },
  start: rufe('start:daten'),
  wissenLaden: rufe('wissen:laden'),
  setze: rufe('eintrag:setze'),
  loesche: rufe('eintrag:loesche'),
  loese: rufe('konflikt:loese'),
  konto: { anmelden: rufe('konto:anmelden'), registrieren: rufe('konto:registrieren'), abmelden: rufe('konto:abmelden') },
  sync: rufe('sync:jetzt'),
  klopfen: rufe('klopfen:jetzt'),
  frage: rufe('frage'),
  anhangSpeichern: rufe('anhang:speichern'),
  pfadVon: (f) => { try { return webUtils.getPathForFile(f); } catch { return ''; } },
  lizenzen: rufe('lizenzen'),
  rdp: rufe('rdp'),
  standFoto: rufe('stand:foto'),
  einstellungen: rufe('einstellungen:setzen'),
  hirnTesten: rufe('hirn:testen'),
  link: rufe('link'),
  beiSync: hoere('sync:status'),
  beiKlopfStart: hoere('klopfen:start'),
  beiKlopfen: hoere('klopfen:neu'),
  beiDaten: hoere('daten:neu'),
});
