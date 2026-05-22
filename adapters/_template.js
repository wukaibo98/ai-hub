/**
 * AI Hub Adapter Template
 *
 * Each adapter exports:
 *   id, name, url, icon, color
 *   models[]              - available models with { id, name, url? }
 *   defaultModel          - default model id
 *   switchModelScript(id) - returns JS to switch model in the UI
 *   newConversationScript()
 *   deleteConversationScript()
 *   sendScript(text)
 *   observeScript
 */

module.exports = {
  id: 'example',
  name: 'Example AI',
  url: 'https://example.com/chat',
  icon: '💡',
  color: '#ff6600',

  // ── Model Definitions ────────────────────────────
  // Each model can optionally have a unique URL.
  // If no URL, switchModelScript handles UI-based switching.
  models: [
    { id: 'example-fast',  name: 'Example Fast' },
    { id: 'example-pro',   name: 'Example Pro',  url: 'https://example.com/chat?model=pro' },
  ],
  defaultModel: 'example-fast',

  switchModelScript(modelId) {
    // Option A: If model has a URL, the app navigates automatically.
    // Option B: Click through the UI to switch.
    return `
      (async () => {
        const btn = document.querySelector('[class*="model"]');
        if (btn) {
          btn.click();
          await new Promise(r => setTimeout(r, 500));
          const options = document.querySelectorAll('[role="option"]');
          for (const opt of options) {
            if (opt.textContent.includes(${JSON.stringify(modelId)})) {
              opt.click();
              return;
            }
          }
        }
      })();
    `;
  },

  // ── Conversation Management ──────────────────────
  newConversationScript() {
    return `
      (async () => {
        const btn = [...document.querySelectorAll('button')].find(b =>
          b.textContent.trim().toLowerCase().includes('new chat')
        );
        if (btn) btn.click();
      })();
    `;
  },

  deleteConversationScript() {
    return `
      (async () => {
        // Hover → more menu → delete → confirm
      })();
    `;
  },

  // ── Send & Observe ───────────────────────────────
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
        return msgs.length > 0 ? msgs[msgs.length - 1].textContent : '';
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
