module.exports = {
  id: 'claude',
  name: 'Claude',
  url: 'https://claude.ai',
  icon: '🧠',
  color: '#d97706',

  newConversationScript() {
    return `
      (async () => {
        // Click the "New chat" button
        const newBtn = document.querySelector('button[aria-label="New chat"]') ||
                       document.querySelector('a[href="/new"]') ||
                       [...document.querySelectorAll('button')].find(b =>
                         b.textContent.trim().toLowerCase().includes('new chat') ||
                         b.textContent.trim().toLowerCase().includes('new conversation')
                       );
        if (newBtn) {
          newBtn.click();
        } else {
          window.location.href = 'https://claude.ai/new';
        }
      })();
    `;
  },

  deleteConversationScript() {
    return `
      (async () => {
        try {
          // Hover on the current conversation in sidebar to reveal menu
          const sidebarItems = document.querySelectorAll('[data-testid="conversation-item"], nav a[href*="/chat/"]');
          if (sidebarItems.length === 0) return;

          const firstItem = sidebarItems[0];
          firstItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          firstItem.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          await new Promise(r => setTimeout(r, 500));

          // Click the more options button
          const moreBtn = document.querySelector('button[aria-label="More"]') ||
                         document.querySelector('button[aria-label="Options"]') ||
                         firstItem.querySelector('button');
          if (moreBtn) {
            moreBtn.click();
            await new Promise(r => setTimeout(r, 300));
          }

          // Find and click delete
          const deleteBtn = [...document.querySelectorAll('button, [role="menuitem"]')].find(b =>
            b.textContent.trim().toLowerCase().includes('delete')
          );
          if (deleteBtn) {
            deleteBtn.click();
            await new Promise(r => setTimeout(r, 500));

            // Confirm
            const confirmBtn = [...document.querySelectorAll('button')].find(b =>
              b.textContent.trim().toLowerCase() === 'delete' ||
              b.textContent.trim().toLowerCase() === 'confirm'
            );
            if (confirmBtn) confirmBtn.click();
          }
        } catch(e) {
          console.error('AI Hub delete error (Claude):', e);
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
          const ta = await waitFor('[contenteditable="true"]');
          ta.focus();
          const pm = document.querySelector('.ProseMirror');
          const target = pm || ta;
          const raw = ${escaped};
          target.focus();
          document.execCommand('insertText', false, raw);
          await new Promise(r => setTimeout(r, 500));

          const sendBtn = document.querySelector('button[aria-label="Send Message"]') ||
                          document.querySelector('button[aria-label="Send"]');
          if (sendBtn && !sendBtn.disabled) sendBtn.click();
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
        let msgs = document.querySelectorAll('[data-is-streaming]');
        if (msgs.length === 0) msgs = document.querySelectorAll('.font-claude-message');
        if (msgs.length > 0) return msgs[msgs.length - 1].innerText || '';
        const turns = document.querySelectorAll('[data-testid="assistant-turn"]');
        if (turns.length > 0) return turns[turns.length - 1].innerText || '';
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
        const streaming = document.querySelector('[data-is-streaming]');
        if (!streaming && lastText) {
          setTimeout(() => { if (window.__aiHub) window.__aiHub.sendReplyDone(ADAPTER_ID); }, 500);
        }
      });
      streamObserver.observe(document.body, { childList: true, subtree: true });
    })();
  `
};
