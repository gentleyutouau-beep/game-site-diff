/**
 * Sitemap 检查脚本
 * 用于 GitHub Actions 定时执行
 */

import { RSSManager } from './rss-manager.js';
import { cleanOldLogs } from './supabase.js';

// Discord 配置
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Telegram 配置
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_TARGET_CHAT = process.env.TELEGRAM_TARGET_CHAT;

/**
 * 发送 Discord 消息
 */
async function sendDiscordMessage(content) {
  if (!DISCORD_TOKEN || !DISCORD_CHANNEL_ID) {
    console.log('Discord 未配置，跳过通知');
    return;
  }

  try {
    const url = `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`;

    // 分割长消息
    const MAX_LENGTH = 1900;
    const chunks = [];

    if (content.length > MAX_LENGTH) {
      const lines = content.split('\n');
      let currentChunk = '';

      for (const line of lines) {
        if ((currentChunk + line + '\n').length > MAX_LENGTH) {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = line + '\n';
          } else {
            chunks.push(line.substring(0, MAX_LENGTH));
          }
        } else {
          currentChunk += line + '\n';
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk);
      }
    } else {
      chunks.push(content);
    }

    for (const chunk of chunks) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${DISCORD_TOKEN}`
        },
        body: JSON.stringify({ content: chunk })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Discord 发送失败:', error);
      }

      // 避免发送太快
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('Discord 通知发送成功');
  } catch (error) {
    console.error('发送 Discord 消息失败:', error);
  }
}

/**
 * 发送 Discord Embed 消息
 */
async function sendDiscordEmbed(embed) {
  if (!DISCORD_TOKEN || !DISCORD_CHANNEL_ID) {
    return;
  }

  try {
    const url = `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${DISCORD_TOKEN}`
      },
      body: JSON.stringify({ embeds: [embed] })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Discord Embed 发送失败:', error);
    }
  } catch (error) {
    console.error('发送 Discord Embed 失败:', error);
  }
}

/**
 * 发送 Telegram 消息
 */
async function sendTelegramMessage(content) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_TARGET_CHAT) {
    console.log('Telegram 未配置，跳过通知');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_TARGET_CHAT,
        text: content,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Telegram 发送失败:', error);
    } else {
      console.log('Telegram 通知发送成功');
    }
  } catch (error) {
    console.error('发送 Telegram 消息失败:', error);
  }
}

/**
 * 主函数：检查所有 sitemap
 */
async function main() {
  console.log('========== 开始检查 Sitemap ==========');
  const startTime = Date.now();

  const rssManager = new RSSManager();

  try {
    const feeds = await rssManager.getFeeds();
    console.log(`总共 ${feeds.length} 个订阅源`);

    if (feeds.length === 0) {
      console.log('没有配置的订阅源');
      return;
    }

    // 存储结果
    const domainResults = new Map();
    const allNewUrls = [];
    let processedCount = 0;
    let errorCount = 0;

    // 串行处理所有 feed（GitHub Actions 没有 CPU 限制）
    for (let i = 0; i < feeds.length; i++) {
      const url = feeds[i];
      const domain = new URL(url).hostname;

      try {
        console.log(`[${i + 1}/${feeds.length}] 检查: ${url.substring(0, 60)}...`);

        const result = await rssManager.addFeed(url);
        processedCount++;

        if (result.success) {
          if (!domainResults.has(domain)) {
            domainResults.set(domain, {
              domain,
              newUrls: [],
              totalNew: 0
            });
          }

          if (result.newUrls && result.newUrls.length > 0) {
            const domainData = domainResults.get(domain);
            domainData.newUrls.push(...result.newUrls);
            domainData.totalNew += result.newUrls.length;
            allNewUrls.push(...result.newUrls);

            console.log(`  ✨ ${domain}: +${result.newUrls.length} 个新URL`);
          }
        } else {
          errorCount++;
          console.warn(`  ⚠️ ${url}: ${result.errorMsg}`);
        }

      } catch (error) {
        errorCount++;
        console.error(`  ❌ ${url}: ${error.message}`);
      }

      // 每个请求间隔 200ms，避免被目标网站限流
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n检查完成: 处理 ${processedCount}/${feeds.length} 个，失败 ${errorCount} 个，新增 ${allNewUrls.length} 个URL，耗时 ${duration}s`);

    // 发送通知
    await sendNotifications(domainResults, allNewUrls, processedCount, errorCount);

    // 清理旧日志
    const cleaned = await cleanOldLogs(30);
    if (cleaned > 0) {
      console.log(`清理了 ${cleaned} 条旧日志`);
    }

    console.log('========== 检查完成 ==========');

  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

/**
 * 发送通知
 */
async function sendNotifications(domainResults, allNewUrls, processedCount, errorCount) {
  // 构建报告
  let description = `本次共检查 **${processedCount}** 个站点`;

  if (allNewUrls.length > 0) {
    description += `，发现 **${allNewUrls.length}** 个新 URL`;
  } else {
    description += `，暂无新内容`;
  }

  if (errorCount > 0) {
    description += `\n⚠️ ${errorCount} 个站点检查失败`;
  }

  // 构建域名更新字段
  const fields = [];
  let index = 0;
  for (const [domain, data] of domainResults) {
    if (data.totalNew > 0 && index < 10) {
      fields.push({
        name: `📌 ${domain}`,
        value: `新增: ${data.totalNew} 个 URL`,
        inline: true
      });
      index++;
    }
  }

  if (domainResults.size > 10) {
    fields.push({
      name: '...',
      value: `还有 ${domainResults.size - 10} 个域名有更新`,
      inline: false
    });
  }

  if (fields.length === 0 && allNewUrls.length === 0) {
    fields.push({
      name: '✅ 状态',
      value: '所有站点都没有新内容更新',
      inline: false
    });
  }

  // Discord Embed
  const embed = {
    title: '📊 网站监控 - 定时汇总报告',
    description,
    color: allNewUrls.length > 0 ? 0x00FF00 : 0x808080,
    fields,
    footer: {
      text: 'Site Monitor Bot - GitHub Actions'
    },
    timestamp: new Date().toISOString()
  };

  await sendDiscordEmbed(embed);

  // Telegram 通知
  let telegramMsg = `📊 <b>网站监控报告</b>\n\n`;
  telegramMsg += `检查站点: ${processedCount} 个\n`;
  telegramMsg += `新增URL: ${allNewUrls.length} 个\n`;

  if (errorCount > 0) {
    telegramMsg += `失败: ${errorCount} 个\n`;
  }

  if (allNewUrls.length > 0) {
    telegramMsg += `\n<b>有更新的域名:</b>\n`;
    for (const [domain, data] of domainResults) {
      if (data.totalNew > 0) {
        telegramMsg += `• ${domain}: +${data.totalNew}\n`;
      }
    }
  }

  await sendTelegramMessage(telegramMsg);
}

// 执行
main().catch(error => {
  console.error('执行失败:', error);
  process.exit(1);
});
