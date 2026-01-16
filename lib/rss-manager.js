/**
 * RSS 管理器 - Supabase 版本
 * 替代原 Cloudflare KV 存储
 */

import {
  getFeeds,
  addFeed as addFeedToDb,
  removeFeed as removeFeedFromDb,
  getSitemapContent,
  saveSitemapContent,
  logUpdate
} from './supabase.js';

/**
 * 从 XML 内容提取 URL
 */
function extractURLs(content) {
  const urls = [];
  // 匹配 <loc>...</loc> 标签中的 URL
  const regex = /<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
}

export class RSSManager {
  constructor() {
    // 不再需要 KV 存储
  }

  /**
   * 获取所有监控的 feeds
   */
  async getFeeds() {
    return await getFeeds();
  }

  /**
   * 下载并保存 sitemap 文件
   */
  async downloadSitemap(url) {
    try {
      console.log(`尝试下载 sitemap: ${url}`);

      const domain = new URL(url).hostname;

      // 下载新文件
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      };

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let newContent;
      if (url.endsWith('.gz')) {
        console.log(`解压 gzipped sitemap: ${url}`);
        // Node.js 环境使用 zlib
        const buffer = await response.arrayBuffer();
        const { gunzipSync } = await import('zlib');
        newContent = gunzipSync(Buffer.from(buffer)).toString('utf-8');
      } else {
        newContent = await response.text();
      }

      const newUrls = extractURLs(newContent);
      let diffUrls = [];

      // 获取当前存储的内容
      const currentContent = await getSitemapContent(domain, 'current');

      if (currentContent) {
        const oldUrls = extractURLs(currentContent);
        // 计算新增的 URL
        const oldUrlSet = new Set(oldUrls);
        diffUrls = newUrls.filter(u => !oldUrlSet.has(u));

        // 将当前版本移动到 latest
        await saveSitemapContent(domain, 'latest', currentContent, oldUrls.length);
      }

      // 保存新版本
      await saveSitemapContent(domain, 'current', newContent, newUrls.length);

      // 如果有新 URL，记录日志
      if (diffUrls.length > 0) {
        await logUpdate(domain, diffUrls);
      }

      console.log(`sitemap 已保存: ${domain}, 新增 ${diffUrls.length} 个 URL`);

      return {
        success: true,
        errorMsg: '',
        newUrls: diffUrls
      };

    } catch (error) {
      console.error(`下载 sitemap 失败: ${url}`, error);
      return {
        success: false,
        errorMsg: `下载失败: ${error.message}`,
        newUrls: []
      };
    }
  }

  /**
   * 添加 sitemap 监控
   */
  async addFeed(url) {
    try {
      console.log(`尝试添加/更新 sitemap 监控: ${url}`);

      // 先尝试下载
      const result = await this.downloadSitemap(url);

      if (!result.success) {
        return result;
      }

      // 添加到数据库（如果已存在会更新 updated_at）
      await addFeedToDb(url);

      return {
        ...result,
        errorMsg: result.errorMsg || '成功'
      };

    } catch (error) {
      console.error(`添加 sitemap 监控失败: ${url}`, error);
      return {
        success: false,
        errorMsg: `添加失败: ${error.message}`,
        newUrls: []
      };
    }
  }

  /**
   * 删除 RSS 订阅
   */
  async removeFeed(url) {
    try {
      console.log(`尝试删除 RSS 订阅: ${url}`);

      const feeds = await this.getFeeds();
      if (!feeds.includes(url)) {
        return {
          success: false,
          errorMsg: '该RSS订阅不存在'
        };
      }

      const removed = await removeFeedFromDb(url);

      if (removed) {
        console.log(`成功删除 RSS 订阅: ${url}`);
        return { success: true, errorMsg: '' };
      } else {
        return { success: false, errorMsg: '删除失败' };
      }

    } catch (error) {
      console.error(`删除 RSS 订阅失败: ${url}`, error);
      return {
        success: false,
        errorMsg: `删除失败: ${error.message}`
      };
    }
  }
}
