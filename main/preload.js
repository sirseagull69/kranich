'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const rufe = (kanal) => (...args) => ipcRenderer.invoke(kanal, ...args);

contextBridge.exposeInMainWorld('kranich', {
  ori: { frage: (an, typ, extra) => ipcRenderer.invoke('ori:frage', an, typ, extra), apps: () => ipcRenderer.invoke('ori:apps'), kontext: () => ipcRenderer.invoke('ori:kontext'), zeigen: (app) => ipcRenderer.invoke('ori:zeigen', app), auftrag: (w, v) => ipcRenderer.invoke('ori:auftrag', w, v), beiStand: (cb) => ipcRenderer.on('ori:stand', (_e, d) => cb(d)) },
  standFoto: rufe('stand:foto'),
  vollbild: rufe('fenster:vollbild'),
  pfadVon: (f) => { try { return webUtils.getPathForFile(f); } catch { return ''; } },
  albatros: { liste: rufe('albatros:liste'), tabelle: rufe('albatros:tabelle') },
  beimOeffnen: (cb) => ipcRenderer.on('start:oeffne', (_e, id) => cb(id)),
  projekte: {
    liste: rufe('projekte:liste'),
    anlegen: rufe('projekte:anlegen'),
    laden: rufe('projekte:laden'),
    speichern: rufe('projekte:speichern'),
    loeschen: rufe('projekte:loeschen'),
    dateiSchreiben: rufe('projekte:dateiSchreiben'),
    dateiLesen: rufe('projekte:dateiLesen'),
    vorschauAusHtml: rufe('projekte:vorschauAusHtml'),
  },
  einstellungen: { lesen: rufe('einstellungen:lesen'), setzen: rufe('einstellungen:setzen'), neuerHeimCode: rufe('heim:neuerCode') },
  hirn: { testen: rufe('hirn:testen') },
  entwurf: rufe('kranich:entwurf'),
  varianten: rufe('kranich:varianten'),
  anpassen: rufe('kranich:anpassen'),
  app: {
    plan: rufe('kranich:appPlan'),
    boards: rufe('kranich:appBoards'),
    bausteine: rufe('kranich:bausteine'),
    board: rufe('kranich:appBoard'),
    pruefen: rufe('kranich:pruefen'),
    reparieren: rufe('kranich:reparieren'),
  },
  formate: { liste: rufe('formate:liste'), eigen: rufe('formate:eigen'), raten: rufe('formate:raten') },
  bildPlan: rufe('kranich:bild'),
  datei: {
    bildWaehlen: rufe('datei:bildWaehlen'),
    ordnerWaehlen: rufe('datei:ordnerWaehlen'),
    zeigen: rufe('datei:zeigen'),
    pptxOeffnen: rufe('datei:pptxOeffnen'),
  },
  export: {
    standardOrdner: rufe('export:standardOrdner'),
    entwurf: rufe('export:entwurf'),
    bild: rufe('export:bild'),
    paket: rufe('export:paket'),
    sammlung: rufe('export:sammlung'),
    pptx: rufe('export:pptx'),
  },
});
