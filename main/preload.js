'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const rufe = (kanal) => (...args) => ipcRenderer.invoke(kanal, ...args);

contextBridge.exposeInMainWorld('kranich', {
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
  einstellungen: { lesen: rufe('einstellungen:lesen'), setzen: rufe('einstellungen:setzen') },
  hirn: { testen: rufe('hirn:testen') },
  entwurf: rufe('kranich:entwurf'),
  varianten: rufe('kranich:varianten'),
  anpassen: rufe('kranich:anpassen'),
  formate: { liste: rufe('formate:liste'), eigen: rufe('formate:eigen') },
  bildPlan: rufe('kranich:bild'),
  datei: {
    bildWaehlen: rufe('datei:bildWaehlen'),
    ordnerWaehlen: rufe('datei:ordnerWaehlen'),
    zeigen: rufe('datei:zeigen'),
  },
  export: {
    standardOrdner: rufe('export:standardOrdner'),
    entwurf: rufe('export:entwurf'),
    bild: rufe('export:bild'),
  },
});
