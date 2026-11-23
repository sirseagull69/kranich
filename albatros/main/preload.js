'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const rufe = (k) => (...a) => ipcRenderer.invoke(k, ...a);
contextBridge.exposeInMainWorld('ALB', {
  tabellen: { liste: rufe('tabellen:liste'), neu: rufe('tabellen:neu'), lesen: rufe('tabellen:lesen'), speichern: rufe('tabellen:speichern'), loeschen: rufe('tabellen:loeschen') },
  datei: { importieren: rufe('datei:importieren'), exportieren: rufe('datei:exportieren'), bild: rufe('datei:bild'), zeigen: rufe('datei:zeigen') },
  assistent: rufe('assistent'),
  erklaeren: rufe('erklaeren'),
  einstellungen: { lesen: rufe('einstellungen:lesen'), setzen: rufe('einstellungen:setzen') },
  hirnTesten: rufe('hirn:testen'),
  pfadVon: (f) => { try { return webUtils.getPathForFile(f); } catch { return ''; } },
  beimOeffnen: (cb) => ipcRenderer.on('start:oeffne', (_e, o) => cb(o)),
});
