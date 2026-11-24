'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const rufe = (kanal) => (...args) => ipcRenderer.invoke(kanal, ...args);

contextBridge.exposeInMainWorld('kranich', {
  standFoto: rufe('stand:foto'),
  vollbild: rufe('fenster:vollbild'),
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
