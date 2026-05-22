module.exports = {
  id: 'mimo',
  name: 'MiMo Studio',
  url: 'https://aistudio.xiaomimimo.com/#/c',
  icon: '🟠',
  color: '#ff6900',

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
          // MiMo Studio uses textarea or contenteditable
          const ta = await waitFor('textarea, [contenteditable="true"], .chat-input textarea, .input-area textarea, [role="textbox"]');
          ta.focus();

          // execCommand works for both textarea and contenteditable
          document.execCommand('insertText', false, ${escaped});

          await new Promise(r => setTimeout(r, 500));

          // Try multiple selectors for send button
          const sendBtn =
            document.querySelector('button[type="submit"]') ||
            document.querySelector('[aria-label="发送"]') ||
            document.querySelector('[aria-label="Send"]') ||
            document.querySelector('.send-btn') ||
            document.querySelector('button.send') ||
            document.querySelector('[data-testid="send-button"]') ||
            // Look for any button with send-like text
            [...document.querySelectorAll('button')].find(b => {
              const t = b.textContent.trim().toLowerCase();
              return t === '发送' || t === 'send' || t === '➤';
            });

          if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
          } else {
            // Fallback: try Enter key
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
        // Try multiple selectors for AI response
        const selectors = [
          '.message-ai',
          '.ai-message',
          '.assistant-message',
          '[data-role="assistant"]',
          '.chat-message--assistant',
          '.message-bot',
          '.bot-message',
          // Generic: look for markdown rendered content in last message group
          '.markdown-body',
          '.message-content'
        ];

        for (const sel of selectors) {
          const msgs = document.querySelectorAll(sel);
          if (msgs.length > 0) {
            return msgs[msgs.length - 1].innerText || '';
          }
        }

        // Fallback: find the last message-like element
        const allMsgs = document.querySelectorAll('[class*="message"]');
        if (allMsgs.length >= 2) {
          return allMsgs[allMsgs.length - 1].innerText || '';
        }

        return '';
      }

      function checkForUpdates() {
        const text = getLatestReply();
        if (text && text !== lastText) {
          lastText = text;
          if (window.__aiHub) {
            window.__aiHub.sendReplyChunk(ADAPTER_ID, text);
          }
        }
      }

      // Watch DOM mutations
      const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(checkForUpdates, 300);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Detect streaming end by watching for loading/typing indicators
      const streamObserver = new MutationObserver(() => {
        const loading =
          document.querySelector('.loading') ||
          document.querySelector('.typing') ||
          document.querySelector('[class*="loading"]') ||
          document.querySelector('[class*="typing"]') ||
          document.querySelector('.cursor-blink');

        if (!loading && lastText) {
          setTimeout(() => {
            if (window.__aiHub) {
              window.__aiHub.sendReplyDone(ADAPTER_ID);
            }
          }, 800);
        }
      });

      streamObserver.observe(document.body, { childList: true, subtree: true });
    })();
  `
};
