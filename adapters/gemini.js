module.exports = {
  id: 'gemini',
  name: 'Gemini',
  url: 'https://gemini.google.com',
  icon: '✨',
  color: '#4285f4',

  newConversationScript() {
    return `
      (async () => {
        // Click "New chat" button
        const newBtn = document.querySelector('button[aria-label="New chat"]') ||
                       [...document.querySelectorAll('button, a')].find(b =>
                         b.textContent.trim().toLowerCase().includes('new chat') ||
                         b.getAttribute('aria-label')?.toLowerCase().includes('new chat')
                       );
        if (newBtn) {
          newBtn.click();
        } else {
          window.location.href = 'https://gemini.google.com/app';
        }
      })();
    `;
  },

  deleteConversationScript() {
    return `
      (async () => {
        try {
          // Find the current conversation in the sidebar
          const items = document.querySelectorAll('[data-conversation-id], [class*="conversation"]');
          if (items.length === 0) return;

          const firstItem = items[0];
          firstItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          firstItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          await new Promise(r => setTimeout(r, 500));

          // Find more/kebab menu button
          const moreBtn = document.querySelector('button[aria-label="More"]') ||
                         document.querySelector('button[aria-label="Options"]') ||
                         firstItem.querySelector('button[aria-label*="menu"]');
          if (moreBtn) {
            moreBtn.click();
            await new Promise(r => setTimeout(r, 300));
          }

          // Click delete
          const deleteBtn = [...document.querySelectorAll('button, [role="menuitem"]')].find(b =>
            b.textContent.trim().toLowerCase().includes('delete')
          );
          if (deleteBtn) {
            deleteBtn.click();
            await new Promise(r => setTimeout(r, 500));

            const confirmBtn = [...document.querySelectorAll('button')].find(b =>
              b.textContent.trim().toLowerCase() === 'delete' ||
              b.textContent.trim().toLowerCase() === 'confirm'
            );
            if (confirmBtn) confirmBtn.click();
          }
        } catch(e) {
          console.error('AI Hub delete error (Gemini):', e);
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
          const ta = await waitFor('.ql-editor, [contenteditable="true"], rich-textarea .text-input-field');
          ta.focus();
          document.execCommand('insertText', false, ${escaped});
          await new Promise(r => setTimeout(r, 500));

          const sendBtn = document.querySelector('button[aria-label="Send message"]') ||
                          document.querySelector('.send-button');
          if (sendBtn && !sendBtn.disabled) sendBtn.click();
        } catch(e) {
          console.error('AI Hub send error (Gemini):', e);
        }
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
        if (msgs.length > 0) return msgs[msgs.length - 1].innerText || '';
        const bubbles = document.querySelectorAll('.message-content');
        if (bubbles.length > 0) return bubbles[bubbles.length - 1].innerText || '';
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
        const stopBtn = document.querySelector('button[aria-label="Stop"]');
        if (!stopBtn && lastText) {
          setTimeout(() => { if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID); }, 500);
        }
      });
      streamObserver.observe(document.body, { childList: true, subtree: true });
    })();
  `
};
