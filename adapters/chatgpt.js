module.exports = {
  id: 'chatgpt',
  name: 'ChatGPT',
  url: 'https://chatgpt.com',
  icon: '🤖',
  color: '#10a37f',

  newConversationScript() {
    return `
      (async () => {
        // Navigate to new conversation
        window.location.href = 'https://chatgpt.com';
      })();
    `;
  },

  deleteConversationScript() {
    return `
      (async () => {
        try {
          // Click the conversation options menu (three dots or hover menu)
          const nav = document.querySelector('nav');
          if (!nav) return;

          // Find the active/current conversation item
          const items = nav.querySelectorAll('a[href*="/c/"]');
          if (items.length === 0) return;

          // Hover over the first conversation to reveal the menu
          const firstItem = items[0];
          firstItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          firstItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

          await new Promise(r => setTimeout(r, 500));

          // Find and click the delete button
          const deleteBtn = document.querySelector('[data-testid="delete-conversation-button"]') ||
                           document.querySelector('button[aria-label="Delete conversation"]') ||
                           [...document.querySelectorAll('button')].find(b => {
                             const label = b.getAttribute('aria-label') || '';
                             return label.toLowerCase().includes('delete');
                           });

          if (deleteBtn) {
            deleteBtn.click();
            await new Promise(r => setTimeout(r, 500));

            // Confirm deletion
            const confirmBtn = document.querySelector('button[data-testid="confirm-delete"]') ||
                              [...document.querySelectorAll('button')].find(b =>
                                b.textContent.trim().toLowerCase() === 'delete' ||
                                b.textContent.trim().toLowerCase() === 'confirm'
                              );
            if (confirmBtn) confirmBtn.click();
          }
        } catch(e) {
          console.error('AI Hub delete error (ChatGPT):', e);
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
          const ta = await waitFor('#prompt-textarea');
          ta.focus();
          const text = ${escaped};
          document.execCommand('insertText', false, text);
          await new Promise(r => setTimeout(r, 500));

          const sendBtn = document.querySelector('[data-testid="send-button"]') ||
                          document.querySelector('button[aria-label="Send prompt"]');
          if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
          } else {
            ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
          }
        } catch(e) {
          console.error('AI Hub send error:', e);
        }
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
        if (msgs.length === 0) return '';
        return msgs[msgs.length - 1].innerText || '';
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
        const stopBtn = document.querySelector('[data-testid="stop-button"]') ||
                        document.querySelector('button[aria-label="Stop generating"]');
        if (!stopBtn && lastText) {
          setTimeout(() => { if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID); }, 500);
        }
      });
      streamObserver.observe(document.body, { childList: true, subtree: true });
    })();
  `
};
