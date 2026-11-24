'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const rufe = (k) => (...a) => ipcRenderer.invoke(k, ...a);
contextBridge.exposeInMainWorld('SCH', {
  dokumente: { liste: rufe('dok:liste'), neu: rufe('dok:neu'), lesen: rufe('dok:lesen'), speichern: rufe('dok:speichern'), loeschen: rufe('dok:loeschen') },
  datei: { importieren: rufe('datei:importieren'), docx: rufe('datei:docx'), pdf: rufe('datei:pdf'), drucken: rufe('datei:drucken'), zeigen: rufe('datei:zeigen') },
  assistent: rufe('assistent'),
  einstellungen: { lesen: rufe('einstellungen:lesen'), setzen: rufe('einstellungen:setzen') },
  hirnTesten: rufe('hirn:testen'),
  pfadVon: (f) => { try { return webUtils.getPathForFile(f); } catch { return ''; } },
  beimOeffnen: (cb) => ipcRenderer.on('start:oeffne', (_e, o) => cb(o)),
});
