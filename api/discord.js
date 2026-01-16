/**
 * Discord Webhook API 端点
 * 处理 Discord 斜杠命令
 */

import { RSSManager } from '../lib/rss-manager.js';

// Discord 签名验证
async function verifyDiscordSignature(body, signature, timestamp, publicKey) {
  try {
    const encoder = new TextEncoder();
    const message = encoder.encode(timestamp + body);

    // 将十六进制公钥转换为 Uint8Array
    const keyData = new Uint8Array(publicKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    // 导入公钥
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    );

    // 将十六进制签名转换为 Uint8Array
    const signatureData = new Uint8Array(signature.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

    // 验证签名
    const isValid = await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      signatureData,
      message
    );

    return isValid;
  } catch (error) {
    console.error('签名验证失败:', error);
    return false;
  }
}

/**
 * 处理 Discord RSS 命令
 */
async function handleRSSCommand(options, rssManager) {
  if (options.length === 0) {
    return '请使用以下命令：\n' +
      '/rss list - 显示所有监控的sitemap\n' +
      '/rss add URL - 添加sitemap监控\n' +
      '/rss del URL - 删除sitemap监控';
  }

  const subCommand = options[0].name;

  switch (subCommand) {
    case 'list':
      const feeds = await rssManager.getFeeds();
      if (feeds.length === 0) {
        return '当前没有RSS订阅';
      }
      const feedList = feeds.map(feed => `- ${feed}`).join('\n');
      return `当前RSS订阅总数${feeds.length}个,列表：\n${feedList}`;

    case 'add':
      const url = options[0].options?.[0]?.value;
      if (!url) {
        return '请提供sitemap.xml的URL';
      }
      if (!url.toLowerCase().includes('sitemap')) {
        return 'URL必须包含sitemap关键词';
      }
      const result = await rssManager.addFeed(url);
      if (result.success) {
        return `成功添加sitemap监控：${url}`;
      } else {
        return `添加sitemap监控失败：${url}\n原因：${result.errorMsg}`;
      }

    case 'del':
      const delUrl = options[0].options?.[0]?.value;
      if (!delUrl) {
        return '请提供要删除的RSS订阅链接';
      }
      const delResult = await rssManager.removeFeed(delUrl);
      if (delResult.success) {
        return `成功删除RSS订阅：${delUrl}`;
      } else {
        return `删除RSS订阅失败：${delUrl}\n原因：${delResult.errorMsg}`;
      }

    default:
      return '未知的RSS命令';
  }
}

/**
 * 处理 Status 命令
 */
async function handleStatusCommand(rssManager) {
  const feeds = await rssManager.getFeeds();

  return `🤖 **Site Monitor Bot 运行状态**\n` +
    `------------------------------------\n` +
    `📊 监控站点数: ${feeds.length} 个\n` +
    `⏰ 定时检查: 每8小时 (GitHub Actions)\n` +
    `📱 推送平台: Telegram + Discord\n` +
    `✅ 状态: 正常运行\n` +
    `------------------------------------\n` +
    `时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody = JSON.stringify(req.body);

    // 验证 Discord 签名
    if (signature && timestamp && process.env.DISCORD_PUBLIC_KEY) {
      const isValid = await verifyDiscordSignature(
        rawBody,
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY
      );

      if (!isValid) {
        console.error('Discord 签名验证失败');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const interaction = req.body;

    // 处理 PING（Discord 验证）
    if (interaction.type === 1) {
      console.log('收到 Discord PING 验证请求');
      return res.status(200).json({ type: 1 });
    }

    // 处理命令
    if (interaction.type === 2) {
      const command = interaction.data.name;
      const options = interaction.data.options || [];

      console.log(`收到 Discord 命令: ${command}`);

      const rssManager = new RSSManager();
      let response = '';

      switch (command) {
        case 'rss':
          response = await handleRSSCommand(options, rssManager);
          break;

        case 'status':
          response = await handleStatusCommand(rssManager);
          break;

        case 'news':
          // news 命令需要较长时间，返回提示信息
          // 实际检查由 GitHub Actions 定时执行
          response = '📋 Sitemap 检查由 GitHub Actions 定时执行（每8小时）\n' +
            '如需手动触发，请在 GitHub 仓库的 Actions 页面手动运行 workflow。';
          break;

        default:
          response = '未知命令';
      }

      return res.status(200).json({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: { content: response }
      });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('处理 Discord webhook 失败:', error);
    return res.status(200).json({
      type: 4,
      data: { content: '处理请求失败' }
    });
  }
}
