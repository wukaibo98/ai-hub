// ── State ───────────────────────────────────────────────
let adapters = [];
let config = {};
let activeAdapter = null;
let replyBuffers = {};  // { adapterId: text }

// ── Font Size ───────────────────────────────────────────
function applyFontSize(size) {
  document.documentElement.style.setProperty('--font-size-input', size + 'px');
  document.documentElement.style.setProperty('--font-size-reply', (size - 1) + 'px');
}

function updateSendShortcutHint() {
  const btn = document.getElementById('btn-send');
  const shortcut = config.ui?.sendShortcut || 'cmd+enter';
  btn.title = shortcut === 'enter' ? 'Send (Enter)' : 'Send (Cmd+Enter)';
}

// ── Reset Config ────────────────────────────────────────
async function resetConfig() {
  if (!confirm('Reset all settings to defaults? This will reload the app.')) return;
  await window.aiHub.saveConfig(null);  // signal to reset
  location.reload();
}

// ── Init ────────────────────────────────────────────────
async function init() {
  config = await window.aiHub.getConfig();
  adapters = await window.aiHub.getAdapters();

  applyTheme(config.ui?.theme || 'dark');
  applyFontSize(config.ui?.fontSize || 14);
  updateSendShortcutHint();
  renderSidebar();
  setupEvents();
  setupResize();
}

// ── Theme ───────────────────────────────────────────────
function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  document.body.classList.toggle('dark', theme !== 'light');
  const btn = document.getElementById('btn-theme');
  if (btn) {
    btn.innerHTML = theme === 'light'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
}

function toggleTheme() {
  const current = config.ui?.theme || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  if (!config.ui) config.ui = {};
  config.ui.theme = next;
  applyTheme(next);
  window.aiHub.saveConfig(config);
}

// ── Sidebar ─────────────────────────────────────────────
const GROUP_LABELS = {
  domestic: '🇨🇳 国内',
  international: '🌍 国外',
  custom: '🔧 自定义'
};

function renderSidebar() {
  const list = document.getElementById('adapter-list');
  list.innerHTML = '';

  // Group adapters
  const groups = {};
  adapters.forEach(adapter => {
    const group = adapter.group || 'other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(adapter);
  });

  // Render in order
  const groupOrder = ['domestic', 'international', 'custom'];
  groupOrder.forEach(groupKey => {
    const groupAdapters = groups[groupKey];
    if (!groupAdapters || groupAdapters.length === 0) return;

    // Group header
    const header = document.createElement('div');
    header.className = 'group-header';
    header.textContent = GROUP_LABELS[groupKey] || groupKey;
    list.appendChild(header);

    // Adapter items
    groupAdapters.forEach(adapter => {
      const section = buildAdapterSection(adapter);
      list.appendChild(section);
    });
  });

  // Any adapters without a recognized group
  Object.keys(groups).forEach(groupKey => {
    if (groupOrder.includes(groupKey)) return;
    const header = document.createElement('div');
    header.className = 'group-header';
    header.textContent = GROUP_LABELS[groupKey] || groupKey;
    list.appendChild(header);
    groups[groupKey].forEach(adapter => {
      list.appendChild(buildAdapterSection(adapter));
    });
  });
}

function buildAdapterSection(adapter) {
  const enabled = config.adapters?.[adapter.id]?.enabled !== false;
  const isActive = activeAdapter === adapter.id;
  const currentModel = adapter.currentModel || adapter.defaultModel;
  const isCustom = adapter.id === 'custom';

  const section = document.createElement('div');
  section.className = `ai-section${enabled ? '' : ' ai-section-disabled'}`;
  section.dataset.id = adapter.id;

  // Model selector or URL input for custom
  let controlHTML = '';
  if (isCustom) {
    const customUrl = config.adapters?.custom?.url || '';
    controlHTML = `<input class="ai-url-input" data-adapter="custom" placeholder="Enter URL..." value="${customUrl}" title="Custom website URL">`;
  } else if (adapter.models && adapter.models.length > 0) {
    const options = adapter.models.map(m =>
      `<option value="${m.id}" ${m.id === currentModel ? 'selected' : ''}>${m.name}</option>`
    ).join('');
    controlHTML = `<select class="ai-model-select" data-adapter="${adapter.id}">${options}</select>`;
  }

  section.innerHTML = `
    <div class="ai-section-header${isActive ? ' active' : ''}" data-id="${adapter.id}">
      <div class="ai-section-icon" style="background:${adapter.color}22; color:${adapter.color}">
        ${adapter.icon}
      </div>
      <span class="ai-section-name">${adapter.name}</span>
      <label class="ai-section-toggle" title="${enabled ? 'Disable' : 'Enable'} ${adapter.name}">
        <input type="checkbox" ${enabled ? 'checked' : ''} data-toggle="${adapter.id}">
        <span class="ai-section-toggle-track"></span>
      </label>
    </div>
    <div class="ai-section-bar">
      ${controlHTML}
      ${!isCustom ? `
      <div class="ai-section-actions">
        <button class="ai-action-btn" data-action="login" title="Login / Open ${adapter.name}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        </button>
        <button class="ai-action-btn" data-action="new" title="New conversation">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="ai-action-btn danger" data-action="delete" title="Delete conversation">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      ` : ''}
    </div>
  `;

  // Click header to select adapter
  section.querySelector('.ai-section-header').addEventListener('click', (e) => {
    if (e.target.closest('.ai-section-toggle') || e.target.closest('input[type="checkbox"]')) return;
    selectAdapter(adapter.id);
  });

  // Enable/disable toggle
  const toggle = section.querySelector(`[data-toggle="${adapter.id}"]`);
  toggle.addEventListener('change', async (e) => {
    e.stopPropagation();
    const on = e.target.checked;
    config = await window.aiHub.toggleAdapter(adapter.id, on);
    section.classList.toggle('ai-section-disabled', !on);
  });
  toggle.addEventListener('click', (e) => e.stopPropagation());

  // Custom URL input
  if (isCustom) {
    const urlInput = section.querySelector('.ai-url-input');
    let debounce = null;
    urlInput.addEventListener('input', (e) => {
      e.stopPropagation();
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        config = await window.aiHub.setCustomUrl(urlInput.value.trim());
      }, 500);
    });
    urlInput.addEventListener('click', (e) => {
      e.stopPropagation();
      selectAdapter(adapter.id);
    });
    urlInput.addEventListener('keydown', (e) => e.stopPropagation());
  }

  // Login button
  const loginBtn = section.querySelector('[data-action="login"]');
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectAdapter(adapter.id);
    });
  }

  // New conversation
  const newBtn = section.querySelector('[data-action="new"]');
  if (newBtn) {
    newBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.aiHub.newConversation(adapter.id);
    });
  }

  // Delete conversation
  const deleteBtn = section.querySelector('[data-action="delete"]');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete current conversation in ${adapter.name}?`)) {
        window.aiHub.deleteConversation(adapter.id);
      }
    });
  }

  // Model selector
  const modelSelect = section.querySelector('.ai-model-select');
  if (modelSelect) {
    modelSelect.addEventListener('change', async (e) => {
      e.stopPropagation();
      const modelId = e.target.value;
      config = await window.aiHub.switchModel(adapter.id, modelId);
      adapter.currentModel = modelId;
    });
    modelSelect.addEventListener('click', (e) => e.stopPropagation());
  }

  return section;
}

function selectAdapter(id) {
  activeAdapter = id;
  const adapter = adapters.find(a => a.id === id);

  document.getElementById('current-adapter-icon').textContent = adapter.icon;
  document.getElementById('current-adapter-name').textContent = adapter.name;

  updateActiveHeader(id);

  window.aiHub.showView(id);
  document.getElementById('welcome-screen').style.display = 'none';
}

function updateActiveHeader(id) {
  document.querySelectorAll('.ai-section-header').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

// ── Reply Panel ─────────────────────────────────────────
function toggleReplyPanel() {
  document.getElementById('reply-panel').classList.toggle('hidden');
}

function renderReplyCard(adapterId) {
  const adapter = adapters.find(a => a.id === adapterId);
  if (!adapter) return;

  let card = document.getElementById(`reply-${adapterId}`);
  if (!card) {
    card = document.createElement('div');
    card.id = `reply-${adapterId}`;
    card.className = 'reply-card fade-in';
    card.innerHTML = `
      <div class="reply-card-header">
        <div class="dot loading"></div>
        <span>${adapter.icon} ${adapter.name}</span>
      </div>
      <div class="reply-card-body receiving"></div>
    `;
    document.getElementById('reply-cards').appendChild(card);
  }
  return card;
}

function updateReply(adapterId, text) {
  replyBuffers[adapterId] = text;
  const card = renderReplyCard(adapterId);
  if (card) {
    const body = card.querySelector('.reply-card-body');
    body.textContent = text;
    body.className = 'reply-card-body receiving';
  }

  const sidebarSection = document.querySelector(`.ai-section[data-id="${adapterId}"]`);
  if (sidebarSection && !sidebarSection.querySelector('.reply-badge')) {
    const badge = document.createElement('div');
    badge.className = 'reply-badge';
    sidebarSection.querySelector('.ai-section-header').appendChild(badge);
  }
}

function markReplyDone(adapterId) {
  const card = document.getElementById(`reply-${adapterId}`);
  if (card) {
    const dot = card.querySelector('.dot');
    if (dot) dot.classList.remove('loading');
    const body = card.querySelector('.reply-card-body');
    if (body) body.classList.add('done');
  }
}

function markReplyError(adapterId, msg) {
  const card = renderReplyCard(adapterId);
  if (card) {
    const dot = card.querySelector('.dot');
    if (dot) { dot.classList.remove('loading'); dot.style.background = 'var(--error)'; }
    const body = card.querySelector('.reply-card-body');
    if (body) { body.textContent = `Error: ${msg}`; body.style.color = 'var(--error)'; }
  }
}

// ── Send Message ────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text) return;

  document.getElementById('reply-cards').innerHTML = '';
  replyBuffers = {};
  document.querySelectorAll('.reply-badge').forEach(el => el.remove());

  if (config.ui?.showReplyPanel !== false) {
    document.getElementById('reply-panel').classList.remove('hidden');
  }

  adapters.forEach(adapter => {
    const enabled = config.adapters?.[adapter.id]?.enabled !== false;
    // Skip custom adapter if no URL
    if (adapter.id === 'custom' && !config.adapters?.custom?.url) return;
    if (enabled) renderReplyCard(adapter.id);
  });

  input.value = '';
  autoResize(input);
  await window.aiHub.sendMessage(text);
}

// ── Events ──────────────────────────────────────────────
function setupEvents() {
  document.getElementById('btn-send').addEventListener('click', sendMessage);

  const input = document.getElementById('message-input');
  input.addEventListener('keydown', (e) => {
    const shortcut = config.ui?.sendShortcut || 'cmd+enter';
    if (shortcut === 'enter') {
      // Enter to send, Shift+Enter for newline
      if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault(); sendMessage();
      }
    } else {
      // Cmd/Ctrl+Enter to send (default)
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendMessage(); }
    }
  });
  input.addEventListener('input', () => autoResize(input));

  document.getElementById('btn-toggle-reply').addEventListener('click', toggleReplyPanel);
  document.getElementById('btn-close-reply').addEventListener('click', () => {
    document.getElementById('reply-panel').classList.add('hidden');
  });

  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
  document.querySelector('.modal-backdrop').addEventListener('click', closeSettings);
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);

  document.getElementById('btn-reload').addEventListener('click', () => {
    if (activeAdapter) window.aiHub.reloadView(activeAdapter);
  });

  document.getElementById('btn-external').addEventListener('click', () => {
    if (activeAdapter) {
      const adapter = adapters.find(a => a.id === activeAdapter);
      if (adapter) window.aiHub.openExternal(adapter.url);
    }
  });

  window.aiHub.onReplyStart((id) => {
    const card = document.getElementById(`reply-${id}`);
    if (card) { const dot = card.querySelector('.dot'); if (dot) dot.classList.add('loading'); }
  });
  window.aiHub.onReplyChunk((id, text) => updateReply(id, text));
  window.aiHub.onReplyDone((id) => markReplyDone(id));
  window.aiHub.onReplyError((id, msg) => markReplyError(id, msg));
  window.aiHub.onViewChanged((id) => { activeAdapter = id; updateActiveHeader(id); });
  window.aiHub.onOpenSettings(() => openSettings());
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ── Settings ────────────────────────────────────────────
function openSettings() {
  const modal = document.getElementById('settings-modal');
  const container = document.getElementById('settings-adapters');
  container.innerHTML = '';

  // ── Adapters Section ──
  adapters.forEach(adapter => {
    const enabled = config.adapters?.[adapter.id]?.enabled !== false;
    const div = document.createElement('div');
    div.className = 'settings-adapter';
    div.innerHTML = `
      <div class="settings-adapter-left">
        <div class="settings-adapter-icon" style="background:${adapter.color}22; color:${adapter.color}">
          ${adapter.icon}
        </div>
        <div class="settings-adapter-info">
          <h4>${adapter.name}</h4>
          <p>${adapter.url}</p>
        </div>
      </div>
      <label class="toggle">
        <input type="checkbox" ${enabled ? 'checked' : ''} data-id="${adapter.id}">
        <span class="toggle-slider"></span>
      </label>
    `;

    div.querySelector('input').addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const on = e.target.checked;
      config = await window.aiHub.toggleAdapter(id, on);
      renderSidebar();
    });

    container.appendChild(div);
  });

  // ── General Section ──
  const generalSection = document.getElementById('settings-general');
  generalSection.innerHTML = '';

  // Send shortcut
  const shortcutRow = createSettingRow('Send shortcut', 'How to send messages');
  const shortcutSelect = document.createElement('select');
  shortcutSelect.className = 'settings-select';
  shortcutSelect.innerHTML = `
    <option value="cmd+enter" ${(config.ui?.sendShortcut || 'cmd+enter') === 'cmd+enter' ? 'selected' : ''}>⌘/Ctrl + Enter</option>
    <option value="enter" ${config.ui?.sendShortcut === 'enter' ? 'selected' : ''}>Enter (Shift+Enter for newline)</option>
  `;
  shortcutSelect.addEventListener('change', async () => {
    if (!config.ui) config.ui = {};
    config.ui.sendShortcut = shortcutSelect.value;
    config = await window.aiHub.saveConfig(config);
    updateSendShortcutHint();
  });
  shortcutRow.querySelector('.setting-control').appendChild(shortcutSelect);
  generalSection.appendChild(shortcutRow);

  // Auto-show reply panel
  const replyRow = createSettingRow('Auto-show replies', 'Open reply panel when sending');
  const replyToggle = document.createElement('label');
  replyToggle.className = 'toggle';
  const showReply = config.ui?.showReplyPanel !== false;
  replyToggle.innerHTML = `
    <input type="checkbox" ${showReply ? 'checked' : ''}>
    <span class="toggle-slider"></span>
  `;
  replyToggle.querySelector('input').addEventListener('change', async (e) => {
    if (!config.ui) config.ui = {};
    config.ui.showReplyPanel = e.target.checked;
    config = await window.aiHub.saveConfig(config);
  });
  replyRow.querySelector('.setting-control').appendChild(replyToggle);
  generalSection.appendChild(replyRow);

  // Font size
  const fontRow = createSettingRow('Font size', 'Message input and reply text size');
  const fontSelect = document.createElement('select');
  fontSelect.className = 'settings-select';
  const currentSize = config.ui?.fontSize || 14;
  [12, 13, 14, 15, 16].forEach(s => {
    fontSelect.innerHTML += `<option value="${s}" ${s === currentSize ? 'selected' : ''}>${s}px</option>`;
  });
  fontSelect.addEventListener('change', async () => {
    if (!config.ui) config.ui = {};
    config.ui.fontSize = parseInt(fontSelect.value);
    config = await window.aiHub.saveConfig(config);
    applyFontSize(config.ui.fontSize);
  });
  fontRow.querySelector('.setting-control').appendChild(fontSelect);
  generalSection.appendChild(fontRow);

  // Theme
  const themeRow = createSettingRow('Theme', 'Dark or light appearance');
  const themeSelect = document.createElement('select');
  themeSelect.className = 'settings-select';
  const currentTheme = config.ui?.theme || 'dark';
  themeSelect.innerHTML = `
    <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
    <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light</option>
  `;
  themeSelect.addEventListener('change', async () => {
    if (!config.ui) config.ui = {};
    config.ui.theme = themeSelect.value;
    config = await window.aiHub.saveConfig(config);
    applyTheme(config.ui.theme);
  });
  themeRow.querySelector('.setting-control').appendChild(themeSelect);
  generalSection.appendChild(themeRow);

  // ── Reset Button ──
  const resetSection = document.getElementById('settings-reset');
  resetSection.innerHTML = '';
  const resetBtn = document.createElement('button');
  resetBtn.className = 'settings-reset-btn';
  resetBtn.textContent = 'Reset All Settings';
  resetBtn.addEventListener('click', resetConfig);
  resetSection.appendChild(resetBtn);

  modal.classList.remove('hidden');
}

function createSettingRow(title, desc) {
  const row = document.createElement('div');
  row.className = 'settings-row';
  row.innerHTML = `
    <div class="setting-info">
      <h4>${title}</h4>
      <p>${desc}</p>
    </div>
    <div class="setting-control"></div>
  `;
  return row;
}

function closeSettings() {
  document.getElementById('settings-modal').classList.add('hidden');
}

// ── Resize ──────────────────────────────────────────────
function setupResize() {
  let resizeTimer = null;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { window.aiHub.resizeViews(); }, 16);
  });
  ro.observe(document.body);
}

// ── Boot ────────────────────────────────────────────────
init();
