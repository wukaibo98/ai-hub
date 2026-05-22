const { contextBridge, ipcRenderer } = require('electron');

// Use contextBridge to expose API to the main world (page context)
// This is required when contextIsolation: true
contextBridge.exposeInMainWorld('__aiHub', {
  sendReplyChunk(adapterId, text) {
    ipcRenderer.send('webview-reply-chunk', adapterId, text);
  },
  sendReplyDone(adapterId) {
    ipcRenderer.send('webview-reply-done', adapterId);
  }
});
