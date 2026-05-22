const { contextBridge, ipcRenderer } = require('electron');

// Track registered listeners to prevent accumulation on reload
const registeredListeners = {};

function safeOn(channel, callback) {
  // Remove previous listener for this channel to prevent duplicates
  if (registeredListeners[channel]) {
    ipcRenderer.removeListener(channel, registeredListeners[channel]);
  }
  registeredListeners[channel] = callback;
  ipcRenderer.on(channel, callback);
}

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

  // Events (deduplicated)
  onViewChanged: (cb) => safeOn('view-changed', (e, id) => cb(id)),
  onReplyStart: (cb) => safeOn('reply-start', (e, id) => cb(id)),
  onReplyChunk: (cb) => safeOn('reply-chunk', (e, id, text) => cb(id, text)),
  onReplyDone: (cb) => safeOn('reply-done', (e, id) => cb(id)),
  onReplyError: (cb) => safeOn('reply-error', (e, id, msg) => cb(id, msg)),
  onOpenSettings: (cb) => safeOn('open-settings', () => cb()),

  // External
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});
