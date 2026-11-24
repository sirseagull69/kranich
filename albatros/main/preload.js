'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const rufe = (k) => (...a) => ipcRenderer.invoke(k, ...a);
contextBridge.exposeInMainWorld('ALB', {
  ori: { frage: (an, typ, extra) => ipcRenderer.invoke('ori:frage', an, typ, extra), apps: () => ipcRenderer.invoke('ori:apps'), kontext: () => ipcRenderer.invoke('ori:kontext'), zeigen: (app) => ipcRenderer.invoke('ori:zeigen', app), auftrag: (w, v) => ipcRenderer.invoke('ori:auftrag', w, v), beiStand: (cb) => ipcRenderer.on('ori:stand', (_e, d) => cb(d)) },
  tabellen: { liste: rufe('tabellen:liste'), neu: rufe('tabellen:neu'), lesen: rufe('tabellen:lesen'), speichern: rufe('tabellen:speichern'), loeschen: rufe('tabellen:loeschen') },
  datei: { importieren: rufe('datei:importieren'), exportieren: rufe('datei:exportieren'), bild: rufe('datei:bild'), zeigen: rufe('datei:zeigen') },
  assistent: rufe('assistent'),
  erklaeren: rufe('erklaeren'),
  makroSchreiben: rufe('makro:schreiben'),
  drucken: rufe('drucken'),
  einstellungen: { lesen: rufe('einstellungen:lesen'), setzen: rufe('einstellungen:setzen') },
  hirnTesten: rufe('hirn:testen'),
  standFoto: rufe('stand:foto'),
  pfadVon: (f) => { try { return webUtils.getPathForFile(f); } catch { return ''; } },
  beimOeffnen: (cb) => ipcRenderer.on('start:oeffne', (_e, o) => cb(o)),
});
