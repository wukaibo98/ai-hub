# ⚡ AI Hub — 多AI聚合浏览器

一个窗口，同时对话多个 AI。

把 ChatGPT、Claude、Gemini、DeepSeek、Kimi、MiMo Studio 等 AI 网页版集成到一个桌面应用里，输入一次问题，同时发送给所有 AI，实时对比各家回复。

## ✨ 功能特性

- **多 AI 并行对话** — 一条消息同时发给所有启用的 AI 平台
- **实时回复流** — 各平台回复实时回传，逐字显示
- **独立 Webview 隔离** — 每个 AI 运行在独立容器中，Cookie/登录态互不干扰
- **一键切换** — 左侧边栏点击即可在不同 AI 之间切换
- **全部回复面板** — 右侧面板同时查看所有 AI 的回复，方便对比
- **可扩展架构** — 添加新 AI 只需写一个 JS 文件，无需改其他代码
- **深色主题** — 原生 macOS 风格，长时间使用不伤眼

## 🤖 内置适配器

| AI 平台 | 状态 | 说明 |
|---------|------|------|
| 🤖 ChatGPT | ✅ | OpenAI 官网 |
| 🧠 Claude | ✅ | Anthropic 官网 |
| ✨ Gemini | ✅ | Google 官网 |
| 🔍 DeepSeek | ✅ | DeepSeek 官网 |
| 🌙 Kimi | ✅ | 月之暗面 |
| 🟠 MiMo Studio | ✅ | 小米 MiMo |

## 🚀 快速开始

### 环境要求

- **macOS**（Intel / Apple Silicon 均支持）
- **Node.js 18+**（没有？运行 `brew install node`）

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/wukaibo98/ai-hub.git
cd ai-hub

# 安装依赖
npm install

# 启动应用
npm start
```

### 打包为 .dmg

```bash
# 打包（输出到 dist/ 目录）
npm run build
```

## 📖 使用方法

### 1. 选择 AI

启动后，左侧边栏显示所有已启用的 AI 平台。点击任意一个，右侧会加载对应的网页。

### 2. 首次登录

**首次使用需要在各 AI 网页上手动登录一次。** 登录后 Cookie 会自动保存，下次启动无需重新登录。

### 3. 发送消息

在底部输入框输入问题，按 **⌘ Cmd + Enter** 发送。消息会同时发给所有已启用的 AI 平台。

### 4. 查看回复

- **单个 AI 回复**：左侧点击对应 AI，在右侧网页中直接查看
- **全部回复对比**：点击输入框左侧的 📺 按钮，打开全部回复面板，实时查看所有 AI 的回复

### 5. 管理适配器

点击左下角 ⚙️ 设置按钮，可以开关各个 AI 平台。关闭后的平台不会收到消息。

## 🔧 添加新 AI 平台

1. 在 `adapters/` 目录下新建 `.js` 文件（例如 `qwen.js`）
2. 复制 `adapters/_template.js` 作为模板
3. 修改以下内容：

```js
module.exports = {
  id: 'qwen',                    // 唯一标识
  name: '通义千问',               // 显示名称
  url: 'https://tongyi.aliyun.com', // 网页地址
  icon: '🔮',                    // Emoji 图标
  color: '#615ced',              // 品牌色

  // 发送消息的注入脚本
  sendScript(text) {
    return `
      (async () => {
        const ta = document.querySelector('textarea');
        ta.focus();
        ta.value = ${JSON.stringify(text)};
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        document.querySelector('button[type="submit"]').click();
      })();
    `;
  },

  // 监听回复的注入脚本
  observeScript: \`
    (function() {
      if (window.__aiHubObserver) return;
      window.__aiHubObserver = true;
      const ADAPTER_ID = 'qwen';
      let lastText = '';
      let debounceTimer = null;
      function getLatestReply() {
        const msgs = document.querySelectorAll('.message-ai');
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
  \`
};
```

4. 重启应用，新适配器自动加载

### 适配器工作原理

每个适配器本质上是两段注入到目标网页的 JavaScript：

- **sendScript** — 模拟用户操作：找到输入框 → 填入文本 → 点击发送按钮
- **observeScript** — 通过 MutationObserver 监听 DOM 变化，捕获 AI 回复内容

如果某个 AI 网站改版导致适配器失效，只需更新对应的选择器即可。

## ⌨️ 快捷键

| 操作 | 快捷键 |
|------|--------|
| 发送消息 | ⌘ Cmd + Enter |
| 打开设置 | ⌘ Cmd + , |
| 重载当前页面 | ⌘ Cmd + R |
| 开发者工具 | ⌘ Cmd + Option + I |
| 退出 | ⌘ Cmd + Q |

## 📁 项目结构

```
ai-hub/
├── main.js              # Electron 主进程，窗口管理
├── preload.js           # 主窗口预加载桥接
├── preload-webview.js   # AI 网页注入桥接
├── config-default.json  # 默认配置
├── package.json
├── adapters/            # AI 平台适配器
│   ├── chatgpt.js
│   ├── claude.js
│   ├── gemini.js
│   ├── deepseek.js
│   ├── kimi.js
│   ├── mimo.js
│   └── _template.js     # 适配器模板
├── renderer/            # 前端界面
│   ├── index.html
│   ├── style.css
│   └── app.js
└── README.md
```

## ⚠️ 注意事项

- **登录态**：首次使用需手动登录各 AI 网站，之后自动保持
- **DOM 变动**：各平台前端可能更新，如遇注入失败请更新对应 adapter 的选择器
- **内存占用**：每个 Webview 约占 100-200MB 内存，建议按需启用
- **并发限制**：部分 AI 平台有请求频率限制，短时间内大量发送可能触发验证

## 📄 License

MIT
