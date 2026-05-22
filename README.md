# ⚡ AI Hub — 多AI聚合浏览器

> **⚠️ 本项目仅供学习和研究使用，严禁任何形式的商业用途。**
>
> 使用本项目即表示您同意：不得将本项目用于任何商业目的，包括但不限于商业销售、商业服务、企业内部部署等。违反者后果自负。

一个窗口，同时对话多个 AI。

把 ChatGPT、Claude、Gemini、DeepSeek、Kimi、MiMo Studio 等 AI 网页版集成到一个桌面应用里，输入一次问题，同时发送给所有 AI，实时对比各家回复。

---

## ✨ 功能特性

### 🤖 多 AI 并行对话
一条消息同时发给所有启用的 AI 平台，实时对比各家回复。

### 🔄 多模型版本切换
每个 AI 支持多个模型版本，侧边栏下拉即可切换：

| AI 平台 | 可用模型 |
|---------|---------|
| 🤖 ChatGPT | GPT-4o / GPT-4o Mini / o3 / o4-mini / GPT-4.5 |
| 🧠 Claude | Sonnet 4 / Opus 4 / 3.5 Sonnet / 3.5 Haiku |
| 🔍 DeepSeek | DeepSeek-V3 / DeepSeek-R1 |
| ✨ Gemini | 2.5 Pro / 2.5 Flash / 2.0 Pro / 2.0 Flash |
| 🌙 Kimi | K2 / k1.5 / Moonshot v1 128K |
| 🟠 MiMo Studio | MiMo v2 / MiMo v2 Pro |

### 📋 侧边栏管理
- **启用开关** — 每个 AI 右侧 toggle 开关，直接启用/禁用，不想用的平台一键关闭
- **登录按钮** — 点击 → 按钮打开对应 AI 网页，方便登录账号
- **新建对话** — 点击 + 按钮为当前 AI 创建新对话
- **删除对话** — 点击 🗑 按钮删除当前对话
- **模型选择** — 下拉框切换不同模型版本

### 📺 全部回复面板
右侧面板同时查看所有 AI 的回复，逐字流式显示，方便横向对比。

### 🎨 主题切换
左下角一键切换 Dark / Light 主题。

### 🔧 可扩展架构
添加新 AI 只需在 `adapters/` 目录下写一个 JS 文件，无需改其他代码。

### 🍪 独立隔离
每个 AI 运行在独立 Webview 中，Cookie / 登录态互不干扰。

---

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
# Intel Mac
npm run build

# Apple Silicon Mac
npm run build:arm64

# Universal（两种架构都支持）
npm run build:universal
```

---

## 📖 使用方法

### 1. 登录账号

首次使用，点击侧边栏每个 AI 旁边的 **→ 登录按钮**，在弹出的网页中登录对应平台账号。登录后 Cookie 自动保存，下次启动无需重新登录。

### 2. 选择模型

每个 AI 下方有模型选择下拉框，点击切换不同模型版本。

### 3. 启用 / 禁用 AI

侧边栏每个 AI 右侧有 **toggle 开关**，关闭后该 AI 不会收到消息。

### 4. 发送消息

在底部输入框输入问题，按 **⌘ Cmd + Enter** 发送。消息会同时发给所有已启用的 AI 平台。

### 5. 查看回复

- **单个 AI 回复**：左侧点击对应 AI，在右侧网页中直接查看
- **全部回复对比**：点击输入框左侧的 📺 按钮，打开全部回复面板，实时查看所有 AI 的回复

### 6. 管理对话

- 点击 **+** 按钮为当前 AI 创建新对话
- 点击 **🗑** 按钮删除当前对话

---

## 🔧 添加新 AI 平台

1. 在 `adapters/` 目录下新建 `.js` 文件（例如 `qwen.js`）
2. 复制 `adapters/_template.js` 作为模板
3. 实现以下接口：

```js
module.exports = {
  id: 'qwen',                        // 唯一标识
  name: '通义千问',                   // 显示名称
  url: 'https://tongyi.aliyun.com',   // 网页地址
  icon: '🔮',                        // Emoji 图标
  color: '#615ced',                   // 品牌色

  // 可选：可用模型列表
  models: [
    { id: 'qwen-max',  name: 'Qwen Max' },
    { id: 'qwen-plus', name: 'Qwen Plus' },
  ],
  defaultModel: 'qwen-max',

  // 可选：模型切换脚本
  switchModelScript(modelId) { return `...`; },

  // 新建对话脚本
  newConversationScript() { return `...`; },

  // 删除对话脚本
  deleteConversationScript() { return `...`; },

  // 发送消息的注入脚本
  sendScript(text) { return `...`; },

  // 监听回复的注入脚本
  observeScript: `...`,
};
```

4. 重启应用，新适配器自动加载

### 适配器工作原理

每个适配器本质上是几段注入到目标网页的 JavaScript：

- **sendScript** — 模拟用户操作：找到输入框 → 填入文本 → 点击发送按钮
- **observeScript** — 通过 MutationObserver 监听 DOM 变化，捕获 AI 回复内容
- **newConversationScript** — 模拟点击"新建对话"按钮或导航到新对话 URL
- **deleteConversationScript** — 模拟删除对话的操作流程
- **switchModelScript** — 模拟切换模型的 UI 操作

如果某个 AI 网站改版导致适配器失效，只需更新对应的选择器即可。

---

## ⌨️ 快捷键

| 操作 | 快捷键 |
|------|--------|
| 发送消息 | ⌘ Cmd + Enter |
| 打开设置 | ⌘ Cmd + , |
| 重载当前页面 | ⌘ Cmd + R |
| 开发者工具 | ⌘ Cmd + Option + I |
| 退出 | ⌘ Cmd + Q |

---

## 📁 项目结构

```
ai-hub/
├── main.js                  # Electron 主进程，窗口管理，IPC
├── preload.js               # 主窗口预加载桥接
├── preload-webview.js       # AI 网页注入桥接
├── config-default.json      # 默认配置
├── package.json
├── adapters/                # AI 平台适配器
│   ├── chatgpt.js           # ChatGPT (5 models)
│   ├── claude.js            # Claude (4 models)
│   ├── gemini.js            # Gemini (4 models)
│   ├── deepseek.js          # DeepSeek (2 models)
│   ├── kimi.js              # Kimi (3 models)
│   ├── mimo.js              # MiMo Studio (2 models)
│   └── _template.js         # 适配器模板
├── renderer/                # 前端界面
│   ├── index.html
│   ├── style.css
│   └── app.js
└── README.md
```

---

## ⚠️ 注意事项

- **登录态**：首次使用需在各 AI 网站手动登录，之后自动保持
- **DOM 变动**：各平台前端可能更新，如遇注入失败请更新对应 adapter 的选择器
- **内存占用**：每个 Webview 约占 100-200MB 内存，建议按需启用
- **并发限制**：部分 AI 平台有请求频率限制，短时间内大量发送可能触发验证
- **网络环境**：部分 AI 平台需要科学上网才能访问

---

## ⚖️ 免责声明

- 本项目为开源学习项目，**严禁商业用途**
- 本项目不收集、不存储、不上传任何用户数据
- 各 AI 平台的账号、对话内容均在用户本地浏览器中处理
- 使用本项目产生的一切后果由用户自行承担
- 各 AI 平台的商标、名称归各自所有者所有
- 如有侵权，请联系删除

---

## 📄 License

MIT — 仅供学习研究，禁止商用。
