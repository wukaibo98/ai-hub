module.exports = {
  id: 'mimo',
  name: 'MiMo Studio',
  url: 'https://aistudio.xiaomimimo.com/#/c',
  icon: '🟠',
  color: '#ff6900',

  newConversationScript() {
    return `
      (async () => {
        // MiMo Studio: navigate to new conversation
        const newBtn = [...document.querySelectorAll('button, a, div[role="button"]')].find(b =>
          b.textContent.trim().includes('新对话') ||
          b.textContent.trim().includes('新建') ||
          b.textContent.trim().toLowerCase().includes('new chat') ||
          b.getAttribute('aria-label')?.includes('新对话')
        );
        if (newBtn) {
          newBtn.click();
        } else {
          window.location.href = 'https://aistudio.xiaomimimo.com/#/c';
        }
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

          const moreBtn = firstItem.querySelector('button') ||
                         document.querySelector('button[aria-label="更多"]') ||
                         document.querySelector('button[aria-label="More"]');
          if (moreBtn) {
            moreBtn.click();
            await new Promise(r => setTimeout(r, 300));
          }

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
          console.error('AI Hub delete error (MiMo):', e);
        }
      })();
    `;
  },

  sendScript(text) {
    const escaped = JSON.stringify(text);
    return `
      (async () => {
        const waitFor = (sel, timeout=8000) => new Promise((resolve, reject) => {
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
          const ta = await waitFor('textarea, [contenteditable="true"], .chat-input textarea, .input-area textarea, [role="textbox"]');
          ta.focus();
          document.execCommand('insertText', false, ${escaped});
          await new Promise(r => setTimeout(r, 500));

          const sendBtn =
            document.querySelector('button[type="submit"]') ||
            document.querySelector('[aria-label="发送"]') ||
            document.querySelector('[aria-label="Send"]') ||
            document.querySelector('.send-btn') ||
            document.querySelector('button.send') ||
            document.querySelector('[data-testid="send-button"]') ||
            [...document.querySelectorAll('button')].find(b => {
              const t = b.textContent.trim().toLowerCase();
              return t === '发送' || t === 'send' || t === '➤';
            });

          if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
          } else {
            ta.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
            }));
          }
        } catch(e) {
          console.error('AI Hub send error (MiMo):', e);
        }
      })();
    `;
  },

  observeScript: `
    (function() {
      if (window.__aiHubObserver) return;
      window.__aiHubObserver = true;
      const ADAPTER_ID = 'mimo';
      let lastText = '';
      let debounceTimer = null;

      function getLatestReply() {
        const selectors = [
          '.message-ai', '.ai-message', '.assistant-message',
          '[data-role="assistant"]', '.chat-message--assistant',
          '.message-bot', '.bot-message', '.markdown-body', '.message-content'
        ];
        for (const sel of selectors) {
          const msgs = document.querySelectorAll(sel);
          if (msgs.length > 0) return msgs[msgs.length - 1].innerText || '';
        }
        const allMsgs = document.querySelectorAll('[class*="message"]');
        if (allMsgs.length >= 2) return allMsgs[allMsgs.length - 1].innerText || '';
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
        const loading =
          document.querySelector('.loading') ||
          document.querySelector('.typing') ||
          document.querySelector('[class*="loading"]') ||
          document.querySelector('[class*="typing"]') ||
          document.querySelector('.cursor-blink');
        if (!loading && lastText) {
          setTimeout(() => { if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID); }, 800);
        }
      });
      streamObserver.observe(document.body, { childList: true, subtree: true });
    })();
  `
};
