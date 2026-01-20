# Discord Slash Commands 配置指南

## 📋 可用命令

配置完成后，你可以在 Discord 中使用以下命令：

| 命令 | 说明 | 示例 |
|------|------|------|
| `/rss list` | 查看所有监控的 sitemap | - |
| `/rss add` | 添加新的 sitemap 监控 | `/rss add https://example.com/sitemap.xml` |
| `/rss del` | 删除 sitemap 监控 | `/rss del https://example.com/sitemap.xml` |
| `/news` | 手动触发检查所有 sitemap | - |
| `/status` | 查看 Bot 运行状态 | - |

## 🚀 配置步骤

### 第一步: 获取 Application ID

1. **访问 Discord Developer Portal**
   - 打开: https://discord.com/developers/applications
   - 选择你的应用（之前创建的 "Site Monitor Bot"）

2. **复制 Application ID**
   - 在左侧菜单选择 **"General Information"**
   - 找到 **"APPLICATION ID"**
   - 点击 **"Copy"** 复制 ID
   - ID 格式类似: `1234567890123456789`

### 第二步: 配置环境变量

编辑 `.dev.vars` 文件，添加一行:

```env
DISCORD_APP_ID=你的_application_id
```

**完整示例**:
```env
TELEGRAM_BOT_TOKEN=7123456789:AAHxxx-xxxx
TELEGRAM_TARGET_CHAT=@my_channel
DISCORD_TOKEN=MTIzNDU2Nzg5.GhIjKl.MnOpQrStUvWx
DISCORD_CHANNEL_ID=1234567890123456789
DISCORD_APP_ID=1234567890123456789
```

### 第三步: 注册命令

运行注册脚本:

```bash
cd /Users/yangjay/AiCoding/02_projects/sitemap-diff
npm run discord:register
```

**预期输出**:
```
🚀 开始注册 Discord Slash Commands...

📝 注册以下命令:
  - /rss: RSS/Sitemap 监控管理
    - /rss list: 显示所有监控的 sitemap
    - /rss add: 添加新的 sitemap 监控
    - /rss del: 删除 sitemap 监控
  - /news: 手动触发检查所有 sitemap 并推送更新
  - /status: 查看 Bot 运行状态和统计信息

✅ 命令注册成功！

📋 已注册的命令列表:
  ✓ /rss (ID: xxxxxxxxxx)
  ✓ /news (ID: xxxxxxxxxx)
  ✓ /status (ID: xxxxxxxxxx)
```

### 第四步: 部署更新后的代码

```bash
npm run deploy
```

### 第五步: 在 Discord 中测试

1. 打开你的 Discord 服务器
2. 在聊天框输入 `/` 查看命令列表
3. 应该能看到:
   - `/rss`
   - `/news`
   - `/status`

## 🧪 测试命令

### 1. 查看状态
```
/status
```
应该返回 Bot 的运行状态。

### 2. 查看监控列表
```
/rss list
```
显示当前所有监控的 sitemap。

### 3. 添加 sitemap
```
/rss add https://example.com/sitemap.xml
```

### 4. 手动触发检查
```
/news
```
立即检查所有 sitemap 并推送更新。

### 5. 删除监控
```
/rss del https://example.com/sitemap.xml
```

## ⚠️ 常见问题

### Q1: 命令没有显示出来
**原因**: 命令需要几分钟同步到 Discord
**解决**: 等待 5-10 分钟，或者重启 Discord 客户端

### Q2: "Application ID 不正确"
**原因**: Application ID 配置错误
**解决**:
1. 确认 ID 是从 "General Information" 页面复制的
2. 确认 `.dev.vars` 中配置正确
3. 不要和 Bot Token 搞混

### Q3: "This interaction failed"
**原因**: Webhook URL 未配置或不正确
**解决**:
1. 在 Discord Developer Portal 的 **"General Information"** 页面
2. 找到 **"INTERACTIONS ENDPOINT URL"**
3. 填入: `https://site-bot.game-sitemap-diff.workers.dev/webhook/discord`
4. 点击 **"Save Changes"**

### Q4: 想删除所有命令
**解决**:
```bash
npm run discord:delete
```

## 📝 命令工作流程

```
用户在 Discord 输入 /rss list
         ↓
Discord 发送 Interaction 到 Webhook
         ↓
Cloudflare Workers 处理请求
         ↓
调用 RSSManager 获取数据
         ↓
返回响应给 Discord
         ↓
用户看到结果
```

## 🎯 下一步

命令配置成功后：
1. 使用 `/status` 检查 Bot 状态
2. 使用 `/rss list` 查看已配置的监控
3. 使用 `/rss add` 添加新的 sitemap
4. 使用 `/news` 随时手动触发检查

所有操作都会同时推送到 Telegram 和 Discord！
