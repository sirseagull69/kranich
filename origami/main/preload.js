'use strict';
// Nur für die eigene Einrichten-Seite. Der Hauptprozess prüft, dass die Anfrage von file:// kommt.
const { contextBridge, ipcRenderer } = require('electron');
if (location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('ori', {
    einst: () => ipcRenderer.invoke('einst'),
    setzen: (adresse) => ipcRenderer.invoke('setzen', adresse),
    nochmal: () => ipcRenderer.invoke('nochmal'),
  });
}
