module.exports = {
  id: 'gemini',
  name: 'Gemini',
  url: 'https://gemini.google.com',
  icon: '✨',
  color: '#4285f4',

  models: [
    { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro',   url: 'https://gemini.google.com/app?model=2.5-pro' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash',  url: 'https://gemini.google.com/app?model=2.5-flash' },
    { id: 'gemini-2.0-pro',   name: 'Gemini 2.0 Pro' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  ],
  defaultModel: 'gemini-2.5-pro',

  switchModelScript(modelId) {
    return `
      (async () => {
        // Gemini: click the model dropdown at the top
        const modelBtn = document.querySelector('[data-test-id="model-selector"]') ||
                         document.querySelector('button[aria-label*="model"]') ||
                         [...document.querySelectorAll('button')].find(b =>
                           b.textContent.match(/gemini|pro|flash/i)
                         );
        if (modelBtn) {
          modelBtn.click();
          await new Promise(r => setTimeout(r, 500));
          const targetId = ${JSON.stringify(modelId)};
          const options = document.querySelectorAll('[role="option"], [role="menuitem"], [class*="model"]');
          for (const opt of options) {
            const text = opt.textContent.trim().toLowerCase();
            if (text.includes(targetId.replace('gemini-', '').replace(/-/g, ' '))) {
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
        const newBtn = document.querySelector('button[aria-label="New chat"]') ||
                       [...document.querySelectorAll('button, a')].find(b =>
                         b.textContent.trim().toLowerCase().includes('new chat') ||
                         b.getAttribute('aria-label')?.toLowerCase().includes('new chat')
                       );
        if (newBtn) newBtn.click();
        else window.location.href = 'https://gemini.google.com/app';
      })();
    `;
  },

  deleteConversationScript() {
    return `
      (async () => {
        try {
          const items = document.querySelectorAll('[data-conversation-id], [class*="conversation"]');
          if (items.length === 0) return;
          const firstItem = items[0];
          firstItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          firstItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          await new Promise(r => setTimeout(r, 500));
          const moreBtn = document.querySelector('button[aria-label="More"]') ||
                         document.querySelector('button[aria-label="Options"]') ||
                         firstItem.querySelector('button[aria-label*="menu"]');
          if (moreBtn) { moreBtn.click(); await new Promise(r => setTimeout(r, 300)); }
          const deleteBtn = [...document.querySelectorAll('button, [role="menuitem"]')].find(b =>
            b.textContent.trim().toLowerCase().includes('delete')
          );
          if (deleteBtn) {
            deleteBtn.click();
            await new Promise(r => setTimeout(r, 500));
            const confirmBtn = [...document.querySelectorAll('button')].find(b =>
              b.textContent.trim().toLowerCase() === 'delete' || b.textContent.trim().toLowerCase() === 'confirm'
            );
            if (confirmBtn) confirmBtn.click();
          }
        } catch(e) { console.error('AI Hub delete error (Gemini):', e); }
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
          const ta = await waitFor('.ql-editor, [contenteditable="true"], rich-textarea .text-input-field');
          ta.focus();
          document.execCommand('insertText', false, ${escaped});
          await new Promise(r => setTimeout(r, 500));
          const sendBtn = document.querySelector('button[aria-label="Send message"]') || document.querySelector('.send-button');
          if (sendBtn && !sendBtn.disabled) sendBtn.click();
          else ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        } catch(e) { console.error('AI Hub send error (Gemini):', e); }
      })();
    `;
  },

  observeScript: `
    (function() {
      if (window.__aiHubObserver) return;
      window.__aiHubObserver = true;
      const ADAPTER_ID = 'gemini';
      let lastText = '';
      let debounceTimer = null;
      function getLatestReply() {
        const msgs = document.querySelectorAll('.model-response-text, .response-container');
        if (msgs.length > 0) return msgs[msgs.length - 1].textContent || '';
        const bubbles = document.querySelectorAll('.message-content');
        return bubbles.length > 0 ? bubbles[bubbles.length - 1].textContent || '' : '';
      }
      function checkForUpdates() {
        const text = getLatestReply();
        if (text && text !== lastText) { lastText = text; if (window.__aiHub) window.__aiHub.sendReplyChunk(ADAPTER_ID, text); }
      }
      new MutationObserver(() => { clearTimeout(debounceTimer); debounceTimer = setTimeout(checkForUpdates, 300); })
        .observe(document.body, { childList: true, subtree: true, characterData: true });
      new MutationObserver(() => {
        const stopBtn = document.querySelector('button[aria-label="Stop"]');
        if (!stopBtn && lastText) setTimeout(() => { if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID); }, 500);
      }).observe(document.body, { childList: true, subtree: true });
    })();
  `
};
