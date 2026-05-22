module.exports = {
  id: 'kimi',
  name: 'Kimi',
  url: 'https://kimi.moonshot.cn',
  icon: '🌙',
  color: '#6366f1',
  group: 'domestic',
  sortOrder: 3,

  models: [
    { id: 'kimi-k2',   name: 'Kimi K2' },
    { id: 'k1.5',      name: 'Kimi k1.5' },
    { id: 'moonshot-v1-128k', name: 'Moonshot v1 128K' },
  ],
  defaultModel: 'kimi-k2',

  switchModelScript(modelId) {
    return `
      (async () => {
        // Kimi: model selector in the input area or header
        const modelBtn = [...document.querySelectorAll('button, div[role="button"]')].find(b =>
          b.textContent.match(/kimi|k1|k2|moonshot/i)
        );
        if (modelBtn) {
          modelBtn.click();
          await new Promise(r => setTimeout(r, 500));
          const targetId = ${JSON.stringify(modelId)};
          const options = document.querySelectorAll('[role="option"], [role="menuitem"], [class*="model"]');
          for (const opt of options) {
            const text = opt.textContent.trim().toLowerCase();
            if (text.includes(targetId.replace(/-/g, ' ')) || text.includes(targetId)) {
              opt.click();
              return;
            }
          }
        }
      })();
    `;
  },

  newConversationScript() {
    return `
      (async () => {
        const newBtn = document.querySelector('[data-testid="new-chat"]') ||
                       [...document.querySelectorAll('button, a, div[role="button"]')].find(b =>
                         b.textContent.trim().includes('新对话') || b.textContent.trim().includes('新建对话')
                       );
        if (newBtn) newBtn.click();
        else window.location.href = 'https://kimi.moonshot.cn';
      })();
    `;
  },

  deleteConversationScript() {
    return `
      (async () => {
        try {
          const items = document.querySelectorAll('[class*="conversation"], [class*="chat-item"]');
          if (items.length === 0) return;
          const firstItem = items[0];
          firstItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          firstItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          await new Promise(r => setTimeout(r, 500));
          const moreBtn = firstItem.querySelector('button') || document.querySelector('button[aria-label="更多"]');
          if (moreBtn) { moreBtn.click(); await new Promise(r => setTimeout(r, 300)); }
          const deleteBtn = [...document.querySelectorAll('button, [role="menuitem"], div[role="button"]')].find(b =>
            b.textContent.trim().includes('删除') || b.textContent.trim().toLowerCase().includes('delete')
          );
          if (deleteBtn) {
            deleteBtn.click();
            await new Promise(r => setTimeout(r, 500));
            const confirmBtn = [...document.querySelectorAll('button')].find(b =>
              b.textContent.trim().includes('确认') || b.textContent.trim().includes('删除')
            );
            if (confirmBtn) confirmBtn.click();
          }
        } catch(e) { console.error('AI Hub delete error (Kimi):', e); }
      })();
    `;
  },

  sendScript(text) {
    const escaped = JSON.stringify(text);
    return `
      (async () => {
        const waitFor = (sel, timeout=5000) => new Promise((resolve, reject) => {
          const start = Date.now();
          const check = () => { const el = document.querySelector(sel); if (el) return resolve(el); if (Date.now() - start > timeout) return reject(new Error('Timeout: ' + sel)); requestAnimationFrame(check); };
          check();
        });
        try {
          const ta = await waitFor('[contenteditable="true"], textarea');
          ta.focus();
          document.execCommand('insertText', false, ${escaped});
          await new Promise(r => setTimeout(r, 500));
          const sendBtn = document.querySelector('button[data-testid="send-button"]') || document.querySelector('[aria-label="发送"]');
          if (sendBtn && !sendBtn.disabled) sendBtn.click();
          else ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        } catch(e) { console.error('AI Hub send error (Kimi):', e); }
      })();
    `;
  },

  observeScript: `
    (function() {
      if (window.__aiHubObserver) return;
      window.__aiHubObserver = true;
      const ADAPTER_ID = 'kimi';
      let lastText = '';
      let debounceTimer = null;
      function getLatestReply() {
        const msgs = document.querySelectorAll('[data-testid="message-ai"], .message--ai');
        if (msgs.length > 0) return msgs[msgs.length - 1].textContent || '';
        const all = document.querySelectorAll('.markdown-body');
        return all.length > 0 ? all[all.length - 1].textContent || '' : '';
      }
      function checkForUpdates() {
        const text = getLatestReply();
        if (text && text !== lastText) { lastText = text; if (window.__aiHub) window.__aiHub.sendReplyChunk(ADAPTER_ID, text); }
      }
      new MutationObserver(() => { clearTimeout(debounceTimer); debounceTimer = setTimeout(checkForUpdates, 300); })
        .observe(document.body, { childList: true, subtree: true, characterData: true });
      new MutationObserver(() => {
        const streaming = document.querySelector('[data-testid="loading"]') || document.querySelector('.loading') || document.querySelector('[class*="typing"]');
        if (!streaming && lastText) setTimeout(() => { if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID); }, 500);
      }).observe(document.body, { childList: true, subtree: true });
    })();
  `
};
