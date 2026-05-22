const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aiHub', {
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),

  // Adapters
  getAdapters: () => ipcRenderer.invoke('get-adapters'),
  getEnabledAdapters: () => ipcRenderer.invoke('get-enabled-adapters'),
  toggleAdapter: (id, enabled) => ipcRenderer.invoke('toggle-adapter', id, enabled),

  // Views
  showView: (id) => ipcRenderer.invoke('show-view', id),
  reloadView: (id) => ipcRenderer.invoke('reload-view', id),
  resizeViews: () => ipcRenderer.invoke('resize-views'),

  // Messaging
  sendMessage: (text) => ipcRenderer.invoke('send-message', text),
  sendToAdapter: (id, text) => ipcRenderer.invoke('send-to-adapter', id, text),
  getReplyBuffer: (id) => ipcRenderer.invoke('get-reply-buffer', id),

  // Events
  onViewChanged: (cb) => ipcRenderer.on('view-changed', (e, id) => cb(id)),
  onReplyStart: (cb) => ipcRenderer.on('reply-start', (e, id) => cb(id)),
  onReplyChunk: (cb) => ipcRenderer.on('reply-chunk', (e, id, text) => cb(id, text)),
  onReplyDone: (cb) => ipcRenderer.on('reply-done', (e, id) => cb(id)),
  onReplyError: (cb) => ipcRenderer.on('reply-error', (e, id, msg) => cb(id, msg)),
  onOpenSettings: (cb) => ipcRenderer.on('open-settings', () => cb()),

  // External
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
