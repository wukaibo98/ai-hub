const { ipcRenderer } = require('electron');

// Expose reply bridge for AI webviews
window.__aiHub = {
  sendReplyChunk(adapterId, text) {
    ipcRenderer.send('webview-reply-chunk', adapterId, text);
  },
  sendReplyDone(adapterId) {
    ipcRenderer.send('webview-reply-done', adapterId);
  }
};
