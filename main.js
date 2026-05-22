const { app, BrowserWindow, BrowserView, ipcMain, session, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Config ──────────────────────────────────────────────
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  const defaults = JSON.parse(fs.readFileSync(path.join(__dirname, 'config-default.json'), 'utf8'));
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...defaults, ...saved };
    }
  } catch (e) { console.error('Config load error:', e); }
  return defaults;
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

let config = loadConfig();
let mainWindow = null;
let webviews = {};       // { adapterId: BrowserView }
let viewBounds = {};     // { adapterId: { x, y, w, h } }
let activeView = null;
let replyBuffers = {};   // { adapterId: accumulated text }

// ── Adapter Loader ──────────────────────────────────────
function loadAdapters() {
  const adaptersDir = path.join(__dirname, 'adapters');
  const adapters = [];
  const files = fs.readdirSync(adaptersDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const adapter = require(path.join(adaptersDir, file));
      adapters.push(adapter);
    } catch (e) {
      console.error(`Failed to load adapter ${file}:`, e);
    }
  }
  return adapters;
}

// ── Window ──────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Build menu
  const template = [
    {
      label: 'AI Hub',
      submenu: [
        { label: 'About AI Hub', click: () => showAbout() },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'Cmd+,', click: () => mainWindow.webContents.send('open-settings') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' }, { role: 'zoom' }, { role: 'close' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  mainWindow.on('closed', () => {
    mainWindow = null;
    webviews = {};
  });
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About AI Hub',
    message: 'AI Hub v1.0.0',
    detail: 'Multi-AI Chat Aggregator\nIntegrate ChatGPT, Claude, Gemini, and more.'
  });
}

// ── Webview Management ──────────────────────────────────
function createWebview(adapterId, url) {
  if (webviews[adapterId]) return webviews[adapterId];

  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload-webview.js'),
      contextIsolation: true,
      nodeIntegration: false,
      partition: `persist:${adapterId}`
    }
  });

  mainWindow.addBrowserView(view);
  view.webContents.loadURL(url);

  // Inject reply observer after page loads
  view.webContents.on('did-finish-load', () => {
    injectObserver(adapterId, view);
  });

  webviews[adapterId] = view;
  return view;
}

function injectObserver(adapterId, view) {
  const adapter = getAdapterById(adapterId);
  if (!adapter || !adapter.observeScript) return;

  view.webContents.executeJavaScript(adapter.observeScript).catch(() => {});
}

function getAdapterById(id) {
  const adapters = loadAdapters();
  return adapters.find(a => a.id === id);
}

function positionView(adapterId) {
  const view = webviews[adapterId];
  if (!view || !mainWindow) return;

  const contentBounds = mainWindow.getContentBounds();
  const sidebarWidth = 220;
  const headerHeight = 52;
  const inputHeight = 80;

  const x = sidebarWidth;
  const y = headerHeight;
  const w = contentBounds.width - sidebarWidth;
  const h = contentBounds.height - headerHeight - inputHeight;

  view.setBounds({ x, y, width: w, height: h });
  viewBounds[adapterId] = { x, y, w, h };
}

function showView(adapterId) {
  // Hide all views
  Object.keys(webviews).forEach(id => {
    if (id !== adapterId) {
      try { mainWindow.removeBrowserView(webviews[id]); } catch {}
    }
  });

  if (!webviews[adapterId]) {
    const adapter = getAdapterById(adapterId);
    if (!adapter) return;
    createWebview(adapterId, adapter.url);
  }

  mainWindow.addBrowserView(webviews[adapterId]);
  positionView(adapterId);
  activeView = adapterId;

  mainWindow.webContents.send('view-changed', adapterId);
}

// ── Message Injection ───────────────────────────────────
async function sendMessage(adapterId, text) {
  const adapter = getAdapterById(adapterId);
  if (!adapter) return;

  let view = webviews[adapterId];
  if (!view) {
    view = createWebview(adapterId, adapter.url);
    await new Promise(r => setTimeout(r, 3000)); // wait for page load
  }

  replyBuffers[adapterId] = '';
  mainWindow.webContents.send('reply-start', adapterId);

  const script = adapter.sendScript(text);
  try {
    await view.webContents.executeJavaScript(script);
  } catch (e) {
    console.error(`Send failed for ${adapterId}:`, e);
    mainWindow.webContents.send('reply-error', adapterId, e.message);
  }
}

// ── IPC Handlers ────────────────────────────────────────
ipcMain.handle('get-config', () => config);

ipcMain.handle('save-config', (event, newConfig) => {
  config = { ...config, ...newConfig };
  saveConfig(config);
  return config;
});

ipcMain.handle('get-adapters', () => loadAdapters());

ipcMain.handle('get-enabled-adapters', () => {
  const adapters = loadAdapters();
  return adapters.filter(a => {
    const cfg = config.adapters?.[a.id];
    return cfg ? cfg.enabled !== false : true;
  });
});

ipcMain.handle('show-view', (event, adapterId) => {
  showView(adapterId);
});

ipcMain.handle('send-message', async (event, text) => {
  const enabledAdapters = loadAdapters().filter(a => {
    const cfg = config.adapters?.[a.id];
    return cfg ? cfg.enabled !== false : true;
  });

  // Send to all enabled adapters in parallel
  const promises = enabledAdapters.map(adapter => {
    return sendMessage(adapter.id, text).catch(e => {
      console.error(`Failed to send to ${adapter.id}:`, e);
    });
  });

  await Promise.allSettled(promises);
});

ipcMain.handle('send-to-adapter', async (event, adapterId, text) => {
  await sendMessage(adapterId, text);
});

ipcMain.handle('get-reply-buffer', (event, adapterId) => {
  return replyBuffers[adapterId] || '';
});

ipcMain.handle('toggle-adapter', (event, adapterId, enabled) => {
  if (!config.adapters) config.adapters = {};
  if (!config.adapters[adapterId]) config.adapters[adapterId] = {};
  config.adapters[adapterId].enabled = enabled;
  saveConfig(config);
  return config;
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('reload-view', (event, adapterId) => {
  if (webviews[adapterId]) {
    webviews[adapterId].webContents.reload();
  }
});

ipcMain.handle('resize-views', () => {
  if (activeView) positionView(activeView);
});

// Reply chunks from webview preload
ipcMain.on('webview-reply-chunk', (event, adapterId, text) => {
  replyBuffers[adapterId] = text;
  mainWindow.webContents.send('reply-chunk', adapterId, text);
});

ipcMain.on('webview-reply-done', (event, adapterId) => {
  mainWindow.webContents.send('reply-done', adapterId);
});

// ── App Lifecycle ───────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle resize
ipcMain.on('window-resize', () => {
  if (activeView) positionView(activeView);
});
