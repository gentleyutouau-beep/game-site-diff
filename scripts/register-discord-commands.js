/**
 * Discord Slash Commands 注册脚本
 * 用于注册 Discord Bot 的斜杠命令
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 .dev.vars 文件
function loadDevVars() {
  try {
    const devVarsPath = join(__dirname, '..', '.dev.vars');
    const content = readFileSync(devVarsPath, 'utf-8');
    const vars = {};

    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          vars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return vars;
  } catch (error) {
    console.warn('⚠️  无法读取 .dev.vars 文件:', error.message);
    return {};
  }
}

// 加载配置
const devVars = loadDevVars();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || devVars.DISCORD_TOKEN || '';
const DISCORD_APP_ID = process.env.DISCORD_APP_ID || devVars.DISCORD_APP_ID || '';

// 定义命令
const commands = [
  {
    name: 'rss',
    description: 'RSS/Sitemap 监控管理',
    options: [
      {
        name: 'list',
        description: '显示所有监控的 sitemap',
        type: 1, // SUB_COMMAND
      },
      {
        name: 'add',
        description: '添加新的 sitemap 监控',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'url',
            description: 'Sitemap 的 URL',
            type: 3, // STRING
            required: true
          }
        ]
      },
      {
        name: 'del',
        description: '删除 sitemap 监控',
        type: 1, // SUB_COMMAND
        options: [
          {
            name: 'url',
            description: '要删除的 Sitemap URL',
            type: 3, // STRING
            required: true
          }
        ]
      }
    ]
  },
  {
    name: 'news',
    description: '手动触发检查所有 sitemap 并推送更新'
  },
  {
    name: 'status',
    description: '查看 Bot 运行状态和统计信息'
  }
];

/**
 * 注册全局命令
 */
async function registerGlobalCommands() {
  if (!DISCORD_TOKEN || DISCORD_TOKEN === 'dummy') {
    console.error('❌ 错误: 请先在 .dev.vars 中配置 DISCORD_TOKEN');
    process.exit(1);
  }

  if (!DISCORD_APP_ID || DISCORD_APP_ID === 'dummy') {
    console.error('❌ 错误: 请先在 .dev.vars 中配置 DISCORD_APP_ID');
    console.log('\n📝 获取 Application ID:');
    console.log('1. 访问 https://discord.com/developers/applications');
    console.log('2. 选择你的应用');
    console.log('3. 在 "General Information" 页面复制 "Application ID"');
    console.log('4. 在 .dev.vars 中添加: DISCORD_APP_ID=你的应用ID\n');
    process.exit(1);
  }

  try {
    console.log('🚀 开始注册 Discord Slash Commands...\n');
    console.log(`Application ID: ${DISCORD_APP_ID}`);
    console.log(`Token: ${DISCORD_TOKEN.substring(0, 20)}...\n`);

    const url = `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/commands`;

    console.log('📝 注册以下命令:');
    commands.forEach(cmd => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
      if (cmd.options) {
        cmd.options.forEach(opt => {
          if (opt.type === 1) { // SUB_COMMAND
            console.log(`    - /${cmd.name} ${opt.name}: ${opt.description}`);
          }
        });
      }
    });
    console.log();

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${DISCORD_TOKEN}`
      },
      body: JSON.stringify(commands)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const data = await response.json();
    console.log('✅ 命令注册成功！\n');

    console.log('📋 已注册的命令列表:');
    data.forEach(cmd => {
      console.log(`  ✓ /${cmd.name} (ID: ${cmd.id})`);
    });

    console.log('\n🎉 完成！现在你可以在 Discord 中使用这些命令了:');
    console.log('  /rss list       - 查看所有监控的 sitemap');
    console.log('  /rss add URL    - 添加新的 sitemap 监控');
    console.log('  /rss del URL    - 删除 sitemap 监控');
    console.log('  /news           - 手动触发检查并推送更新');
    console.log('  /status         - 查看 Bot 状态\n');

  } catch (error) {
    console.error('❌ 注册命令失败:', error.message);
    console.error('\n可能的原因:');
    console.error('1. DISCORD_TOKEN 不正确');
    console.error('2. DISCORD_APP_ID 不正确');
    console.error('3. Bot 权限不足');
    process.exit(1);
  }
}

/**
 * 删除所有命令（可选）
 */
async function deleteAllCommands() {
  try {
    const url = `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/commands`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${DISCORD_TOKEN}`
      },
      body: JSON.stringify([])
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    console.log('✅ 所有命令已删除');

  } catch (error) {
    console.error('❌ 删除命令失败:', error.message);
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--delete')) {
    await deleteAllCommands();
  } else {
    await registerGlobalCommands();
  }
}

main();
