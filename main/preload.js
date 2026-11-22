'use strict';
// Bruecke zwischen Oberflaeche und Hauptprozess. Die Oberflaeche bekommt
// nur window.kranich mit festen Funktionen, keinen Zugriff auf Node.

const { contextBridge, ipcRenderer, webUtils } = require('electron');

const NAMEN = [
  'lage', 'scanPfad', 'scanAbbrechen', 'schutzScan', 'autostart', 'autostartAlsBekannt',
  'wacheStart', 'wacheStopp', 'wacheStatus', 'einstellungenLesen', 'einstellungenSetzen',
  'vtSchluesselSetzen', 'vtSchluesselEntfernen',
  'info', 'verlauf', 'fundIgnorieren', 'schutzScanStatus',
  'quarantaene', 'quarantaeneVerschieben', 'quarantaeneWiederherstellen', 'quarantaeneLoeschen',
  'engineStatus', 'eintragMerken', 'eintragVergessen', 'probealarm', 'testpaket',
  'agentStatus', 'agentKoppeln', 'agentEntkoppeln', 'agentJetzt',
  'kontoStatus', 'kontoAnmelden', 'kontoAnlegen', 'kontoAbmelden',
  'hostGeraete', 'hostFunde', 'hostEreignisse', 'hostAuftraege', 'hostKopplung', 'hostAuftrag', 'hostUmbenennen', 'hostEntfernen',
  'eigenesSystem', 'lokalerAgent',
  'waehlePfad', 'zeigeImOrdner', 'oeffneSchutz',
];

const api = {};
for (const name of NAMEN) api[name] = (...werte) => ipcRenderer.invoke(`kranich:${name}`, ...werte);

api.beiEreignis = (funktion) => {
  const lauscher = (_ereignis, daten) => funktion(daten);
  ipcRenderer.on('kranich:ereignis', lauscher);
  return () => ipcRenderer.removeListener('kranich:ereignis', lauscher);
};

// Pfad einer Datei, die ins Fenster gezogen wurde.
api.pfadVon = (datei) => {
  try {
    return webUtils.getPathForFile(datei) || null;
  } catch {
    return null;
  }
};

contextBridge.exposeInMainWorld('kranich', api);
