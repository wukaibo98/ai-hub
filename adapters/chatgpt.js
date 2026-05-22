module.exports = {
  id: 'chatgpt',
  name: 'ChatGPT',
  url: 'https://chatgpt.com',
  icon: '🤖',
  color: '#10a37f',

  models: [
    { id: 'gpt-4o',       name: 'GPT-4o',       url: 'https://chatgpt.com/?model=gpt-4o' },
    { id: 'gpt-4o-mini',  name: 'GPT-4o Mini',   url: 'https://chatgpt.com/?model=gpt-4o-mini' },
    { id: 'o3',           name: 'o3',             url: 'https://chatgpt.com/?model=o3' },
    { id: 'o4-mini',      name: 'o4-mini',        url: 'https://chatgpt.com/?model=o4-mini' },
    { id: 'gpt-4.5',      name: 'GPT-4.5',        url: 'https://chatgpt.com/?model=gpt-4.5' },
  ],
  defaultModel: 'gpt-4o',

  switchModelScript(modelId) {
    return `
      (async () => {
        // ChatGPT: click the model selector at the top
        const modelBtn = document.querySelector('[data-testid="model-switcher"]') ||
                         document.querySelector('button[class*="model"]') ||
                         [...document.querySelectorAll('button')].find(b =>
                           b.textContent.match(/GPT|o[34]|gpt/i)
                         );
        if (modelBtn) {
          modelBtn.click();
          await new Promise(r => setTimeout(r, 500));
          // Find and click the target model option
          const targetId = ${JSON.stringify(modelId)};
          const options = document.querySelectorAll('[role="option"], [role="menuitem"], [data-testid*="model"]');
          for (const opt of options) {
            const text = opt.textContent.trim().toLowerCase();
            if (text.includes(targetId.replace(/-/g, ' ').toLowerCase()) ||
                text.includes(targetId.toLowerCase())) {
              opt.click();
              return;
            }
          }
        }
      })();
    `;
  },

  newConversationScript() {
    return `(async () => { window.location.href = 'https://chatgpt.com'; })();`;
  },

  deleteConversationScript() {
    return `
      (async () => {
        try {
          const nav = document.querySelector('nav');
          if (!nav) return;
          const items = nav.querySelectorAll('a[href*="/c/"]');
          if (items.length === 0) return;
          const firstItem = items[0];
          firstItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          firstItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          await new Promise(r => setTimeout(r, 500));
          const deleteBtn = document.querySelector('[data-testid="delete-conversation-button"]') ||
                           document.querySelector('button[aria-label="Delete conversation"]') ||
                           [...document.querySelectorAll('button')].find(b =>
                             (b.getAttribute('aria-label') || '').toLowerCase().includes('delete')
                           );
          if (deleteBtn) {
            deleteBtn.click();
            await new Promise(r => setTimeout(r, 500));
            const confirmBtn = document.querySelector('button[data-testid="confirm-delete"]') ||
                              [...document.querySelectorAll('button')].find(b =>
                                b.textContent.trim().toLowerCase() === 'delete'
                              );
            if (confirmBtn) confirmBtn.click();
          }
        } catch(e) { console.error('AI Hub delete error (ChatGPT):', e); }
      })();
    `;
  },

  sendScript(text) {
    const escaped = JSON.stringify(text);
    return `
      (async () => {
        const waitFor = (sel, timeout=5000) => new Promise((resolve, reject) => {
          const start = Date.now();
          const check = () => {
            const el = document.querySelector(sel);
            if (el) return resolve(el);
            if (Date.now() - start > timeout) return reject(new Error('Timeout: ' + sel));
            requestAnimationFrame(check);
          };
          check();
        });
        try {
          const ta = await waitFor('#prompt-textarea');
          ta.focus();
          document.execCommand('insertText', false, ${escaped});
          await new Promise(r => setTimeout(r, 500));
          const sendBtn = document.querySelector('[data-testid="send-button"]') ||
                          document.querySelector('button[aria-label="Send prompt"]');
          if (sendBtn && !sendBtn.disabled) sendBtn.click();
          else ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        } catch(e) { console.error('AI Hub send error:', e); }
      })();
    `;
  },

  observeScript: `
    (function() {
      if (window.__aiHubObserver) return;
      window.__aiHubObserver = true;
      const ADAPTER_ID = 'chatgpt';
      let lastText = '';
      let debounceTimer = null;
      function getLatestReply() {
        const msgs = document.querySelectorAll('[data-message-author-role="assistant"]');
        return msgs.length === 0 ? '' : msgs[msgs.length - 1].textContent || '';
      }
      function checkForUpdates() {
        const text = getLatestReply();
        if (text && text !== lastText) { lastText = text; if (window.__aiHub) window.__aiHub.sendReplyChunk(ADAPTER_ID, text); }
      }
      new MutationObserver(() => { clearTimeout(debounceTimer); debounceTimer = setTimeout(checkForUpdates, 300); })
        .observe(document.body, { childList: true, subtree: true, characterData: true });
      new MutationObserver(() => {
        const stopBtn = document.querySelector('[data-testid="stop-button"]') || document.querySelector('button[aria-label="Stop generating"]');
        if (!stopBtn && lastText) setTimeout(() => { if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID); }, 500);
      }).observe(document.body, { childList: true, subtree: true });
    })();
  `
};
