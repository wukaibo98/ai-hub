module.exports = {
  id: 'chatgpt',
  name: 'ChatGPT',
  url: 'https://chatgpt.com',
  icon: '🤖',
  color: '#10a37f',

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

          // Use InputEvent for React compatibility
          ta.textContent = ${escaped};
          ta.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ${escaped} }));

          await new Promise(r => setTimeout(r, 300));

          // Find and click send button
          const sendBtn = document.querySelector('[data-testid="send-button"]') ||
                          document.querySelector('button[aria-label="Send prompt"]');
          if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
          } else {
            // Fallback: Enter key
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
          if (window.__aiHub) {
            window.__aiHub.sendReplyChunk(ADAPTER_ID, text);
          }
        }
      }

      // Watch for DOM changes
      const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(checkForUpdates, 300);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Also detect when streaming ends (stop button disappears)
      const streamObserver = new MutationObserver(() => {
        const stopBtn = document.querySelector('[data-testid="stop-button"]') ||
                        document.querySelector('button[aria-label="Stop generating"]');
        if (!stopBtn && lastText) {
          setTimeout(() => {
            if (window.__aiHub) {
              window.__aiHub.sendReplyDone(ADAPTER_ID);
            }
          }, 500);
        }
      });

      streamObserver.observe(document.body, { childList: true, subtree: true });
    })();
  `
};
