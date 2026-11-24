'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
const rufe = (k) => (...a) => ipcRenderer.invoke(k, ...a);
contextBridge.exposeInMainWorld('SCH', {
  ori: { frage: (an, typ, extra) => ipcRenderer.invoke('ori:frage', an, typ, extra), apps: () => ipcRenderer.invoke('ori:apps'), kontext: () => ipcRenderer.invoke('ori:kontext'), zeigen: (app) => ipcRenderer.invoke('ori:zeigen', app), auftrag: (w, v) => ipcRenderer.invoke('ori:auftrag', w, v), beiStand: (cb) => ipcRenderer.on('ori:stand', (_e, d) => cb(d)) },
  dokumente: { liste: rufe('dok:liste'), neu: rufe('dok:neu'), lesen: rufe('dok:lesen'), speichern: rufe('dok:speichern'), loeschen: rufe('dok:loeschen') },
  datei: { ordnerWaehlen: rufe('datei:ordnerWaehlen'), textKopie: rufe('datei:textKopie'), speichern: rufe('datei:speichern'), info: rufe('datei:info'), status: rufe('datei:status'), importieren: rufe('datei:importieren'), docx: rufe('datei:docx'), pdf: rufe('datei:pdf'), drucken: rufe('datei:drucken'), zeigen: rufe('datei:zeigen') },
  assistent: rufe('assistent'),
  einstellungen: { lesen: rufe('einstellungen:lesen'), setzen: rufe('einstellungen:setzen') },
  hirnTesten: rufe('hirn:testen'),
  systemName: rufe('system:name'),
  zuletzt: rufe('zuletzt:liste'),
  schliessen: rufe('fenster:schliessen'),
  beimSpeichernUndZu: (cb) => ipcRenderer.on('datei:speichernUndZu', () => cb()),
  albatros: { liste: rufe('albatros:liste'), tabelle: rufe('albatros:tabelle'), oeffnen: rufe('albatros:oeffnen') },
  linkOeffnen: rufe('link:oeffnen'),
  pfadVon: (f) => { try { return webUtils.getPathForFile(f); } catch { return ''; } },
  beimRechtschreiben: (cb) => ipcRenderer.on('rechtschreibung:frage', (_e, w) => cb(w)),
  beimOeffnen: (cb) => ipcRenderer.on('start:oeffne', (_e, o) => cb(o)),
});
