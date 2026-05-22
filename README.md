# ⚡ AI Hub

Multi-AI Chat Aggregator — 一个窗口集成多个 AI 网页版。

## 功能

- 🤖 **ChatGPT** / 🧠 **Claude** / ✨ **Gemini** / 🔍 **DeepSeek** / 🌙 **Kimi** / 🟠 **MiMo Studio** 集成
- 一键发送消息到所有 AI 平台
- 实时显示各平台回复
- 可扩展的 Adapter 架构，轻松添加新 AI
- 深色主题，原生 macOS 体验

## 安装

```bash
# 克隆或拷贝项目到 Mac
cd ai-hub

# 安装依赖
npm install

# 启动
npm start
```

## 打包

```bash
# 打包为 .dmg (Intel x64)
npm run build
```

## 添加新 AI 平台

1. 在 `adapters/` 目录下新建 `.js` 文件
2. 参考 `adapters/_template.js` 编写适配器
3. 重启应用，新适配器自动加载

### Adapter 结构

```js
module.exports = {
  id: 'myai',           // 唯一标识
  name: 'My AI',        // 显示名称
  url: 'https://...',   // 网页地址
  icon: '🎯',           // Emoji 图标
  color: '#ff6600',     // 品牌色

  // 发送消息的注入脚本
  sendScript(text) { return `...javascript...`; },

  // 监听回复的注入脚本
  observeScript: `...javascript...`
};
```

## 快捷键

| 操作 | 快捷键 |
|------|--------|
| 发送消息 | `Cmd + Enter` |
| 设置 | `Cmd + ,` |
| 重载页面 | `Cmd + R` |
| 开发者工具 | `Cmd + Option + I` |

## 注意事项

- 首次使用需要在各 AI 网页上手动登录，之后 Cookie 会自动保持
- 各平台 DOM 结构可能更新，如遇注入失败请更新对应的 Adapter
- 同时打开过多 Webview 会占用较多内存
