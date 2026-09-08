const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', Object.freeze({
  zotero: Object.freeze(Object.fromEntries(['status','connect','search','disconnect','authorize'].map(method=>[method,arg=>ipcRenderer.invoke('zotero:'+method,arg)]))),
  getDefaults: () => ipcRenderer.invoke('app:defaults'),
  reload: () => ipcRenderer.invoke('app:reload'),
  setLanguage: (value) => ipcRenderer.invoke('app:language', value),
  open: () => ipcRenderer.invoke('document:open'),
  save: (payload) => ipcRenderer.invoke('document:save', payload),
  setDirty: (value) => ipcRenderer.invoke('document:dirty', Boolean(value)),
  confirmDiscard: () => ipcRenderer.invoke('document:confirm-discard'),
}));
