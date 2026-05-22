module.exports = {
  id: 'deepseek',
  name: 'DeepSeek',
  url: 'https://chat.deepseek.com',
  icon: '🔍',
  color: '#4d6bfe',

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

          if (ta.tagName === 'TEXTAREA' || ta.tagName === 'INPUT') {
            // React-compatible value setter
            const setter = Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype, 'value'
            ).set;
            setter.call(ta, ${escaped});
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            ta.textContent = ${escaped};
            ta.dispatchEvent(new InputEvent('input', { bubbles: true }));
          }

          await new Promise(r => setTimeout(r, 300));

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
    })();
  `
};
