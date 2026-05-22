// ── State ───────────────────────────────────────────────
let adapters = [];
let config = {};
let activeAdapter = null;
let replyBuffers = {};  // { adapterId: text }

// ── Init ────────────────────────────────────────────────
async function init() {
  config = await window.aiHub.getConfig();
  adapters = await window.aiHub.getAdapters();

  applyTheme(config.ui?.theme || 'dark');
  renderSidebar();
  setupEvents();
  setupResize();
}

// ── Theme ───────────────────────────────────────────────
function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  document.body.classList.toggle('dark', theme !== 'light');
  // Update theme button icon
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
function renderSidebar() {
  const list = document.getElementById('adapter-list');
  list.innerHTML = '';

  adapters.forEach(adapter => {
    const enabled = config.adapters?.[adapter.id]?.enabled !== false;
    const item = document.createElement('div');
    item.className = `adapter-item${activeAdapter === adapter.id ? ' active' : ''}`;
    item.dataset.id = adapter.id;

    item.innerHTML = `
      <div class="adapter-icon" style="background:${adapter.color}22; color:${adapter.color}">
        ${adapter.icon}
      </div>
      <span class="adapter-name">${adapter.name}</span>
      <div class="adapter-status${enabled ? '' : ' disabled'}"></div>
    `;

    item.addEventListener('click', () => selectAdapter(adapter.id));
    list.appendChild(item);
  });
}

function selectAdapter(id) {
  activeAdapter = id;
  const adapter = adapters.find(a => a.id === id);

  // Update header
  document.getElementById('current-adapter-icon').textContent = adapter.icon;
  document.getElementById('current-adapter-name').textContent = adapter.name;

  // Update sidebar active state
  document.querySelectorAll('.adapter-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // Show webview
  window.aiHub.showView(id);

  // Hide welcome screen
  document.getElementById('welcome-screen').style.display = 'none';
}

// ── Reply Panel ─────────────────────────────────────────
function toggleReplyPanel() {
  const panel = document.getElementById('reply-panel');
  panel.classList.toggle('hidden');
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

  // Update sidebar badge
  const sidebarItem = document.querySelector(`.adapter-item[data-id="${adapterId}"]`);
  if (sidebarItem && !sidebarItem.querySelector('.reply-badge')) {
    const badge = document.createElement('div');
    badge.className = 'reply-badge';
    sidebarItem.appendChild(badge);
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
    if (dot) {
      dot.classList.remove('loading');
      dot.style.background = 'var(--error)';
    }
    const body = card.querySelector('.reply-card-body');
    if (body) {
      body.textContent = `Error: ${msg}`;
      body.style.color = 'var(--error)';
    }
  }
}

// ── Send Message ────────────────────────────────────────
async function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text) return;

  // Clear reply panel
  document.getElementById('reply-cards').innerHTML = '';
  replyBuffers = {};

  // Remove badges
  document.querySelectorAll('.reply-badge').forEach(el => el.remove());

  // Show reply panel
  document.getElementById('reply-panel').classList.remove('hidden');

  // Pre-render cards for enabled adapters
  adapters.forEach(adapter => {
    const enabled = config.adapters?.[adapter.id]?.enabled !== false;
    if (enabled) renderReplyCard(adapter.id);
  });

  input.value = '';
  autoResize(input);

  // Send to all enabled
  await window.aiHub.sendMessage(text);
}

// ── Events ──────────────────────────────────────────────
function setupEvents() {
  // Send button
  document.getElementById('btn-send').addEventListener('click', sendMessage);

  // Input
  const input = document.getElementById('message-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  });
  input.addEventListener('input', () => autoResize(input));

  // Reply panel toggle
  document.getElementById('btn-toggle-reply').addEventListener('click', toggleReplyPanel);
  document.getElementById('btn-close-reply').addEventListener('click', () => {
    document.getElementById('reply-panel').classList.add('hidden');
  });

  // Settings
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
  document.querySelector('.modal-backdrop').addEventListener('click', closeSettings);

  // Theme toggle
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);

  // Reload
  document.getElementById('btn-reload').addEventListener('click', () => {
    if (activeAdapter) window.aiHub.reloadView(activeAdapter);
  });

  // External
  document.getElementById('btn-external').addEventListener('click', () => {
    if (activeAdapter) {
      const adapter = adapters.find(a => a.id === activeAdapter);
      if (adapter) window.aiHub.openExternal(adapter.url);
    }
  });

  // IPC events
  window.aiHub.onReplyStart((id) => {
    const card = document.getElementById(`reply-${id}`);
    if (card) {
      const dot = card.querySelector('.dot');
      if (dot) dot.classList.add('loading');
    }
  });

  window.aiHub.onReplyChunk((id, text) => updateReply(id, text));
  window.aiHub.onReplyDone((id) => markReplyDone(id));
  window.aiHub.onReplyError((id, msg) => markReplyError(id, msg));
  window.aiHub.onViewChanged((id) => {
    activeAdapter = id;
    renderSidebar();
  });
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

  modal.classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settings-modal').classList.add('hidden');
}

// ── Resize ──────────────────────────────────────────────
function setupResize() {
  const ro = new ResizeObserver(() => {
    window.aiHub.resizeViews();
  });
  ro.observe(document.body);
}

// ── Boot ────────────────────────────────────────────────
init();
