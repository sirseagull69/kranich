'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nest', {
  apps: () => ipcRenderer.invoke('apps'),
  zuletzt: () => ipcRenderer.invoke('zuletzt'),
  starte: (id, args) => ipcRenderer.invoke('starte', id, args),
  einst: () => ipcRenderer.invoke('einst'),
  updates: () => ipcRenderer.invoke('updates'),
  updateLaden: (id) => ipcRenderer.invoke('update:laden', id),
  beiFortschritt: (cb) => ipcRenderer.on('update:fortschritt', (_e, d) => cb(d)),
  version: () => ipcRenderer.invoke('version'),
  einstSetzen: (neu) => ipcRenderer.invoke('einst:setzen', neu),
});
