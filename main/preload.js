'use strict';
// Bruecke zwischen Oberflaeche und Hauptprozess. Die Oberflaeche bekommt
// nur window.kranich mit festen Funktionen, keinen Zugriff auf Node.

const { contextBridge, ipcRenderer } = require('electron');

const NAMEN = [
  'lage', 'scanPfad', 'scanAbbrechen', 'schutzScan', 'autostart', 'autostartAlsBekannt',
  'wacheStart', 'wacheStopp', 'wacheStatus', 'einstellungenLesen', 'einstellungenSetzen',
  'vtSchluesselSetzen', 'vtSchluesselEntfernen', 'waehlePfad', 'zeigeImOrdner',
];

const api = {};
for (const name of NAMEN) api[name] = (...werte) => ipcRenderer.invoke(`kranich:${name}`, ...werte);

api.beiEreignis = (funktion) => {
  const lauscher = (_ereignis, daten) => funktion(daten);
  ipcRenderer.on('kranich:ereignis', lauscher);
  return () => ipcRenderer.removeListener('kranich:ereignis', lauscher);
};

contextBridge.exposeInMainWorld('kranich', api);
