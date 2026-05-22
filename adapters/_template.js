/**
 * AI Hub Adapter Template
 * Copy this file and customize for new AI platforms.
 *
 * Each adapter exports:
 *   id        - unique identifier (matches filename without .js)
 *   name      - display name
 *   url       - the AI platform URL
 *   icon      - emoji icon
 *   color     - brand color hex
 *   sendScript(text)         - returns JS to inject to send a message
 *   observeScript            - JS string injected once to watch for reply updates
 *   newConversationScript()  - returns JS to start a new conversation
 *   deleteConversationScript() - returns JS to delete the current conversation
 *
 * Reply detection:
 *   Call window.__aiHub.sendReplyChunk(adapterId, text) when reply text changes.
 *   Call window.__aiHub.sendReplyDone(adapterId) when streaming completes.
 */

module.exports = {
  id: 'example',
  name: 'Example AI',
  url: 'https://example.com/chat',
  icon: '💡',
  color: '#ff6600',

  newConversationScript() {
    return `
      (async () => {
        // Option 1: Navigate to new conversation URL
        // window.location.href = 'https://example.com/chat';

        // Option 2: Click a "New Chat" button
        const btn = document.querySelector('button.new-chat') ||
                    [...document.querySelectorAll('button')].find(b =>
                      b.textContent.trim().toLowerCase().includes('new chat')
                    );
        if (btn) btn.click();
      })();
    `;
  },

  deleteConversationScript() {
    return `
      (async () => {
        try {
          // Hover on conversation in sidebar to reveal menu
          const items = document.querySelectorAll('.conversation-item');
          if (items.length === 0) return;

          const firstItem = items[0];
          firstItem.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          await new Promise(r => setTimeout(r, 500));

          // Click more options
          const moreBtn = firstItem.querySelector('button[aria-label="More"]');
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

            // Confirm
            const confirmBtn = [...document.querySelectorAll('button')].find(b =>
              b.textContent.trim().toLowerCase() === 'confirm'
            );
            if (confirmBtn) confirmBtn.click();
          }
        } catch(e) {
          console.error('AI Hub delete error:', e);
        }
      })();
    `;
  },

  sendScript(text) {
    const escaped = JSON.stringify(text);
    return `
      (async () => {
        const ta = document.querySelector('textarea');
        if (!ta) return;
        ta.focus();
        ta.value = ${escaped};
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        const btn = document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      })();
    `;
  },

  observeScript: `
    (function() {
      if (window.__aiHubObserver) return;
      window.__aiHubObserver = true;
      const ADAPTER_ID = 'example';
      let lastText = '';
      let debounceTimer = null;
      function getLatestReply() {
        const msgs = document.querySelectorAll('.ai-message');
        return msgs.length > 0 ? msgs[msgs.length - 1].innerText : '';
      }
      function check() {
        const text = getLatestReply();
        if (text && text !== lastText) {
          lastText = text;
          if (window.__aiHub) window.__aiHub.sendReplyChunk(ADAPTER_ID, text);
        }
      }
      new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(check, 300);
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    })();
  `
};
