# Discord 推送快速配置指南

## 🎯 配置步骤

### 第一步: 创建 Discord Bot (5分钟)

1. **访问 Discord Developer Portal**
   - 打开: https://discord.com/developers/applications
   - 登录你的 Discord 账号

2. **创建应用**
   - 点击右上角 **"New Application"**
   - 输入名称，如 "Site Monitor Bot"
   - 点击 **"Create"**

3. **创建 Bot**
   - 左侧菜单点击 **"Bot"**
   - 点击 **"Add Bot"** → **"Yes, do it!"**
   - 点击 **"Reset Token"** 获取 Token
   - **复制并保存** Token（格式类似: `MTIzNDU2.GhIjKl.MnOpQr...`）

4. **启用权限**
   在 Bot 页面向下滚动，开启:
   - ✅ **MESSAGE CONTENT INTENT**

### 第二步: 邀请 Bot 到服务器

1. **生成邀请链接**
   - 左侧菜单: **OAuth2** → **URL Generator**
   - 勾选 SCOPES: ✅ `bot`
   - 勾选权限:
     - ✅ Send Messages
     - ✅ Embed Links
     - ✅ Attach Files

2. **邀请到服务器**
   - 复制生成的 URL
   - 在浏览器打开
   - 选择你的服务器
   - 授权

### 第三步: 获取 Channel ID

1. **启用开发者模式**
   - Discord 客户端 → 设置 ⚙️ → 高级
   - 开启 **"开发者模式"**

2. **复制频道 ID**
   - 右键点击目标频道
   - 选择 **"复制频道 ID"**
   - 保存 ID（格式: `1234567890123456789`）

### 第四步: 配置环境变量

编辑 `.dev.vars` 文件:

```env
DISCORD_TOKEN=你的_bot_token
DISCORD_CHANNEL_ID=你的_频道_id
```

**完整示例**:
```env
TELEGRAM_BOT_TOKEN=7123456789:AAHxxx-xxxx
TELEGRAM_TARGET_CHAT=@my_channel
DISCORD_TOKEN=MTIzNDU2Nzg5.GhIjKl.MnOpQrStUvWx
DISCORD_CHANNEL_ID=1234567890123456789
```

### 第五步: 运行测试

```bash
cd /Users/yangjay/AiCoding/02_projects/sitemap-diff
node scripts/test-discord.js
```

**预期输出**:
```
🚀 开始测试 Discord Bot 推送功能
...
✅ 所有测试完成！请检查 Discord 频道中的消息。
```

在 Discord 频道中应该看到 4 条测试消息。

## 🔧 集成到项目

### 更新 config.js

当前项目已支持 Discord，但需要添加 Channel ID 配置。

编辑 `src/config.js`:

```javascript
export const discordConfig = {
  token: null,
  channelId: null, // 添加这行
};

export function initConfig(env) {
  telegramConfig.token = env.TELEGRAM_BOT_TOKEN || "";
  telegramConfig.targetChat = env.TELEGRAM_TARGET_CHAT || "";
  discordConfig.token = env.DISCORD_TOKEN || "";
  discordConfig.channelId = env.DISCORD_CHANNEL_ID || ""; // 添加这行

  // ...
}
```

### 在定时任务中发送 Discord 通知

编辑 `src/index.js` 的 `performScheduledMonitoring` 函数，在发送 Telegram 通知后添加 Discord 通知:

```javascript
// 发送统一汇总报告
await sendUnifiedReport(domainResults, allNewUrls, processedCount, errorCount);

// 同时发送到 Discord (如果配置了)
if (discordConfig.token && discordConfig.channelId) {
  await sendDiscordUnifiedReport(
    discordConfig.channelId,
    domainResults,
    allNewUrls.length,
    processedCount,
    errorCount
  );
}
```

## 🚀 部署到生产环境

```bash
# 设置 Discord 环境变量
wrangler secret put DISCORD_TOKEN
# 输入你的 Token

wrangler secret put DISCORD_CHANNEL_ID
# 输入你的 Channel ID

# 重新部署
npm run deploy
```

## ❓ 常见问题

### Q1: "401 Unauthorized"
**原因**: Token 不正确
**解决**: 在 Developer Portal 重新生成 Token

### Q2: "403 Forbidden"
**原因**: Bot 没有权限
**解决**:
- 确认 Bot 已加入服务器
- 检查频道权限设置
- 重新生成邀请链接并授权

### Q3: "404 Not Found"
**原因**: Channel ID 不正确
**解决**: 重新复制 Channel ID

### Q4: 测试脚本提示模块未找到
**原因**: 缺少 formdata-node 依赖
**解决**:
```bash
npm install formdata-node
```

## 📝 测试清单

- [ ] 获取 Discord Bot Token
- [ ] Bot 已加入服务器
- [ ] 获取 Channel ID
- [ ] 配置 .dev.vars 文件
- [ ] 运行 test-discord.js 成功
- [ ] 在 Discord 看到 4 条测试消息
- [ ] 设置生产环境变量
- [ ] 部署并验证

完成后，你的 Site Bot 就可以同时向 Telegram 和 Discord 推送更新通知了！
