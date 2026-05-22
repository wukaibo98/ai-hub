module.exports = {
  id: 'kimi',
  name: 'Kimi',
  url: 'https://kimi.moonshot.cn',
  icon: '🌙',
  color: '#6366f1',

  newConversationScript() {
    return `
      (async () => {
        // Kimi: click new chat button
        const newBtn = document.querySelector('[data-testid="new-chat"]') ||
                       [...document.querySelectorAll('button, a, div[role="button"]')].find(b =>
                         b.textContent.trim().includes('新对话') ||
                         b.textContent.trim().includes('新建对话') ||
                         b.getAttribute('aria-label')?.includes('新对话')
                       );
        if (newBtn) {
          newBtn.click();
        } else {
          window.location.href = 'https://kimi.moonshot.cn';
        }
      })();
    `;
  },

  deleteConversationScript() {
    return `
      (async () => {
        try {
          // Hover on conversation in sidebar
          const items = document.querySelectorAll('[class*="conversation"], [class*="chat-item"]');
          if (items.length === 0) return;

          const firstItem = items[0];
          firstItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          firstItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          await new Promise(r => setTimeout(r, 500));

          // Find more options button
          const moreBtn = firstItem.querySelector('button') ||
                         document.querySelector('button[aria-label="更多"]') ||
                         document.querySelector('button[aria-label="More"]');
          if (moreBtn) {
            moreBtn.click();
            await new Promise(r => setTimeout(r, 300));
          }

          // Click delete
          const deleteBtn = [...document.querySelectorAll('button, [role="menuitem"], div[role="button"]')].find(b =>
            b.textContent.trim().includes('删除') ||
            b.textContent.trim().toLowerCase().includes('delete')
          );
          if (deleteBtn) {
            deleteBtn.click();
            await new Promise(r => setTimeout(r, 500));

            const confirmBtn = [...document.querySelectorAll('button')].find(b =>
              b.textContent.trim().includes('确认') ||
              b.textContent.trim().includes('删除') ||
              b.textContent.trim().toLowerCase() === 'confirm'
            );
            if (confirmBtn) confirmBtn.click();
          }
        } catch(e) {
          console.error('AI Hub delete error (Kimi):', e);
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
          const ta = await waitFor('[contenteditable="true"], textarea');
          ta.focus();
          document.execCommand('insertText', false, ${escaped});
          await new Promise(r => setTimeout(r, 500));

          const sendBtn = document.querySelector('button[data-testid="send-button"]') ||
                          document.querySelector('[aria-label="发送"]');
          if (sendBtn && !sendBtn.disabled) sendBtn.click();
        } catch(e) {
          console.error('AI Hub send error (Kimi):', e);
        }
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
        if (msgs.length > 0) return msgs[msgs.length - 1].innerText || '';
        const all = document.querySelectorAll('.markdown-body');
        if (all.length > 0) return all[all.length - 1].innerText || '';
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
        const streaming = document.querySelector('[data-testid="loading"]') ||
                          document.querySelector('.loading') ||
                          document.querySelector('[class*="typing"]');
        if (!streaming && lastText) {
          setTimeout(() => { if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID); }, 500);
        }
      });
      streamObserver.observe(document.body, { childList: true, subtree: true });
    })();
  `
};
