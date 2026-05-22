module.exports = {
  id: 'gemini',
  name: 'Gemini',
  url: 'https://gemini.google.com',
  icon: '✨',
  color: '#4285f4',

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
          if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
          }
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
        // Fallback
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

      // Detect stop button
      const streamObserver = new MutationObserver(() => {
        const stopBtn = document.querySelector('button[aria-label="Stop"]');
        if (!stopBtn && lastText) {
          setTimeout(() => {
            if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID);
          }, 500);
        }
      });

      streamObserver.observe(document.body, { childList: true, subtree: true });
    })();
  `
};
