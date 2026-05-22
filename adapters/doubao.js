module.exports = {
  id: 'doubao',
  name: '豆包',
  url: 'https://www.doubao.com/chat/',
  icon: '🫘',
  color: '#2563eb',
  group: 'domestic',

  models: [
    { id: 'doubao-pro', name: '豆包 Pro', url: 'https://www.doubao.com/chat/' },
    { id: 'doubao-lite', name: '豆包 Lite' },
  ],
  defaultModel: 'doubao-pro',

  switchModelScript(modelId) {
    return `
      (async () => {
        const modelBtn = [...document.querySelectorAll('button, div[role="button"], span')].find(b =>
          b.textContent.match(/豆包|doubao|pro|lite/i) && b.offsetParent !== null
        );
        if (modelBtn) {
          modelBtn.click();
          await new Promise(r => setTimeout(r, 500));
          const targetId = ${JSON.stringify(modelId)};
          const options = document.querySelectorAll('[role="option"], [role="menuitem"], [class*="model"], li');
          for (const opt of options) {
            const text = opt.textContent.trim().toLowerCase();
            if (text.includes(targetId.replace('doubao-', '')) || text.includes(targetId)) {
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
        const newBtn = [...document.querySelectorAll('button, a, div[role="button"]')].find(b =>
          b.textContent.trim().includes('新对话') || b.textContent.trim().includes('新建') ||
          b.textContent.trim().includes('新聊天') || b.textContent.trim().toLowerCase().includes('new chat')
        );
        if (newBtn) newBtn.click();
        else window.location.href = 'https://www.doubao.com/chat/';
      })();
    `;
  },

  deleteConversationScript() {
    return `
      (async () => {
        try {
          const items = document.querySelectorAll('[class*="conversation"], [class*="chat-item"], [class*="session"]');
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
        } catch(e) { console.error('AI Hub delete error (Doubao):', e); }
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
          const ta = await waitFor('textarea, [contenteditable="true"], [role="textbox"]');
          ta.focus();
          document.execCommand('insertText', false, ${escaped});
          await new Promise(r => setTimeout(r, 500));
          const sendBtn = document.querySelector('button[type="submit"]') || document.querySelector('[aria-label="发送"]') || document.querySelector('[data-testid="send-button"]') ||
            [...document.querySelectorAll('button')].find(b => { const t = b.textContent.trim().toLowerCase(); return t === '发送' || t === 'send'; });
          if (sendBtn && !sendBtn.disabled) sendBtn.click();
          else ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        } catch(e) { console.error('AI Hub send error (Doubao):', e); }
      })();
    `;
  },

  observeScript: `
    (function() {
      if (window.__aiHubObserver) return;
      window.__aiHubObserver = true;
      const ADAPTER_ID = 'doubao';
      let lastText = '';
      let debounceTimer = null;
      function getLatestReply() {
        const selectors = ['.message-ai','.ai-message','.assistant-message','[data-role="assistant"]','.chat-message--assistant','.message-bot','.bot-message','.markdown-body','.message-content'];
        for (const sel of selectors) { const msgs = document.querySelectorAll(sel); if (msgs.length > 0) return msgs[msgs.length - 1].textContent || ''; }
        const allMsgs = document.querySelectorAll('[class*="message"]');
        return allMsgs.length >= 2 ? allMsgs[allMsgs.length - 1].textContent || '' : '';
      }
      function checkForUpdates() {
        const text = getLatestReply();
        if (text && text !== lastText) { lastText = text; if (window.__aiHub) window.__aiHub.sendReplyChunk(ADAPTER_ID, text); }
      }
      new MutationObserver(() => { clearTimeout(debounceTimer); debounceTimer = setTimeout(checkForUpdates, 300); })
        .observe(document.body, { childList: true, subtree: true, characterData: true });
      new MutationObserver(() => {
        const loading = document.querySelector('.loading') || document.querySelector('.typing') || document.querySelector('[class*="loading"]') || document.querySelector('[class*="typing"]');
        if (!loading && lastText) setTimeout(() => { if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID); }, 800);
      }).observe(document.body, { childList: true, subtree: true });
    })();
  `
};
