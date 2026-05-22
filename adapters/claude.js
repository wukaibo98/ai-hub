module.exports = {
  id: 'claude',
  name: 'Claude',
  url: 'https://claude.ai',
  icon: '🧠',
  color: '#d97706',

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
          // Claude uses a contenteditable div or ProseMirror
          const ta = await waitFor('[contenteditable="true"]');
          ta.focus();

          // ProseMirror approach
          const pm = document.querySelector('.ProseMirror');
          const target = pm || ta;

          // Use execCommand for reliable text insertion
          const raw = ${escaped};
          target.focus();
          document.execCommand('insertText', false, raw);

          await new Promise(r => setTimeout(r, 500));

          const sendBtn = document.querySelector('button[aria-label="Send Message"]') ||
                          document.querySelector('button[aria-label="Send"]');
          if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
          }
        } catch(e) {
          console.error('AI Hub send error (Claude):', e);
        }
      })();
    `;
  },

  observeScript: `
    (function() {
      if (window.__aiHubObserver) return;
      window.__aiHubObserver = true;

      const ADAPTER_ID = 'claude';
      let lastText = '';
      let debounceTimer = null;

      function getLatestReply() {
        // Claude's assistant messages - NodeList is always truthy even when empty,
        // so || doesn't work as fallback. Check length instead.
        let msgs = document.querySelectorAll('[data-is-streaming]');
        if (msgs.length === 0) {
          msgs = document.querySelectorAll('.font-claude-message');
        }
        if (msgs.length > 0) {
          return msgs[msgs.length - 1].innerText || '';
        }
        // Fallback: look for assistant turn markers
        const turns = document.querySelectorAll('[data-testid="assistant-turn"]');
        if (turns.length > 0) {
          return turns[turns.length - 1].innerText || '';
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

      const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(checkForUpdates, 300);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Detect streaming end
      const streamObserver = new MutationObserver(() => {
        const streaming = document.querySelector('[data-is-streaming]');
        if (!streaming && lastText) {
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
