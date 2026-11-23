'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nest', {
  apps: () => ipcRenderer.invoke('apps'),
  zuletzt: () => ipcRenderer.invoke('zuletzt'),
  starte: (id, args) => ipcRenderer.invoke('starte', id, args),
  einst: () => ipcRenderer.invoke('einst'),
  einstSetzen: (neu) => ipcRenderer.invoke('einst:setzen', neu),
});
