module.exports = {
  id: 'deepseek',
  name: 'DeepSeek',
  url: 'https://chat.deepseek.com',
  icon: '🔍',
  color: '#4d6bfe',

  newConversationScript() {
    return `
      (async () => {
        // Click "New Chat" button in sidebar
        const newBtn = document.querySelector('a[href="/"]') ||
                       [...document.querySelectorAll('div[role="button"], button, a')].find(b =>
                         b.textContent.trim().includes('新对话') ||
                         b.textContent.trim().toLowerCase().includes('new chat')
                       );
        if (newBtn) {
          newBtn.click();
        } else {
          window.location.href = 'https://chat.deepseek.com';
        }
      })();
    `;
  },

  deleteConversationScript() {
    return `
      (async () => {
        try {
          // Hover on conversation in sidebar
          const items = document.querySelectorAll('.ds-conversation-item, [class*="conversation"]');
          if (items.length === 0) return;

          const firstItem = items[0];
          firstItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          firstItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          await new Promise(r => setTimeout(r, 500));

          // Find delete button or context menu
          const deleteBtn = document.querySelector('[aria-label="Delete"]') ||
                           [...document.querySelectorAll('button, div[role="button"]')].find(b =>
                             b.textContent.trim().includes('删除') ||
                             b.textContent.trim().toLowerCase().includes('delete')
                           );
          if (deleteBtn) {
            deleteBtn.click();
            await new Promise(r => setTimeout(r, 500));

            // Confirm
            const confirmBtn = [...document.querySelectorAll('button')].find(b =>
              b.textContent.trim().includes('确认') ||
              b.textContent.trim().toLowerCase() === 'delete' ||
              b.textContent.trim().toLowerCase() === 'confirm'
            );
            if (confirmBtn) confirmBtn.click();
          }
        } catch(e) {
          console.error('AI Hub delete error (DeepSeek):', e);
        }
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
          const ta = await waitFor('textarea, [contenteditable="true"]');
          ta.focus();
          document.execCommand('insertText', false, ${escaped});
          await new Promise(r => setTimeout(r, 500));

          const sendBtn = document.querySelector('div[role="button"][aria-disabled="false"]') ||
                          document.querySelector('button[type="submit"]');
          if (sendBtn) sendBtn.click();
        } catch(e) {
          console.error('AI Hub send error (DeepSeek):', e);
        }
      })();
    `;
  },

  observeScript: `
    (function() {
      if (window.__aiHubObserver) return;
      window.__aiHubObserver = true;
      const ADAPTER_ID = 'deepseek';
      let lastText = '';
      let debounceTimer = null;

      function getLatestReply() {
        const msgs = document.querySelectorAll('.ds-markdown--block, .markdown-body');
        if (msgs.length > 0) return msgs[msgs.length - 1].innerText || '';
        return '';
      }

      function checkForUpdates() {
        const text = getLatestReply();
        if (text && text !== lastText) {
          lastText = text;
          if (window.__aiHub) window.__aiHub.sendReplyChunk(ADAPTER_ID, text);
        }
      }

      const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(checkForUpdates, 300);
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });

      const streamObserver = new MutationObserver(() => {
        const stopBtn = document.querySelector('[aria-label="Stop"]') ||
                        document.querySelector('.ds-loading') ||
                        document.querySelector('[class*="stop"]');
        if (!stopBtn && lastText) {
          setTimeout(() => { if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID); }, 500);
        }
      });
      streamObserver.observe(document.body, { childList: true, subtree: true });
    })();
  `
};
