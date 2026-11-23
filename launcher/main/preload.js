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
  claudeStatus: () => ipcRenderer.invoke('claude:status'),
  claudeLaden: () => ipcRenderer.invoke('claude:laden'),
  claudeToken: (t) => ipcRenderer.invoke('claude:token', t),
  claudeAnmeldenFenster: () => ipcRenderer.invoke('claude:anmeldenFenster'),
  claudeAbmelden: () => ipcRenderer.invoke('claude:abmelden'),
  beiClaudeFortschritt: (cb) => ipcRenderer.on('claude:fortschritt', (_e, p) => cb(p)),
  einstSetzen: (neu) => ipcRenderer.invoke('einst:setzen', neu),
});
