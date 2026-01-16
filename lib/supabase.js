/**
 * Supabase 客户端
 */

import { createClient } from '@supabase/supabase-js';

let supabase = null;

/**
 * 获取 Supabase 客户端
 */
export function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY 环境变量');
    }

    supabase = createClient(url, key);
  }
  return supabase;
}

/**
 * 获取所有订阅源
 */
export async function getFeeds() {
  const db = getSupabase();
  const { data, error } = await db
    .from('feeds')
    .select('url')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取订阅源失败:', error);
    return [];
  }

  return data.map(row => row.url);
}

/**
 * 添加订阅源
 */
export async function addFeed(url) {
  const db = getSupabase();
  const domain = new URL(url).hostname;

  const { error } = await db
    .from('feeds')
    .upsert({ url, domain, updated_at: new Date().toISOString() }, { onConflict: 'url' });

  if (error) {
    console.error('添加订阅源失败:', error);
    return false;
  }

  return true;
}

/**
 * 删除订阅源
 */
export async function removeFeed(url) {
  const db = getSupabase();

  const { error } = await db
    .from('feeds')
    .delete()
    .eq('url', url);

  if (error) {
    console.error('删除订阅源失败:', error);
    return false;
  }

  return true;
}

/**
 * 获取 sitemap 内容
 */
export async function getSitemapContent(domain, type = 'current') {
  const db = getSupabase();

  const { data, error } = await db
    .from('sitemaps')
    .select('content')
    .eq('domain', domain)
    .eq('type', type)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // 不是"没找到"错误
      console.error('获取 sitemap 内容失败:', error);
    }
    return null;
  }

  return data?.content || null;
}

/**
 * 保存 sitemap 内容
 */
export async function saveSitemapContent(domain, type, content, urlCount = 0) {
  const db = getSupabase();

  const { error } = await db
    .from('sitemaps')
    .upsert({
      domain,
      type,
      content,
      url_count: urlCount,
      updated_at: new Date().toISOString()
    }, { onConflict: 'domain,type' });

  if (error) {
    console.error('保存 sitemap 内容失败:', error);
    return false;
  }

  return true;
}

/**
 * 记录更新日志
 */
export async function logUpdate(domain, newUrls) {
  const db = getSupabase();

  const { error } = await db
    .from('update_logs')
    .insert({
      domain,
      new_urls_count: newUrls.length,
      new_urls: newUrls
    });

  if (error) {
    console.error('记录更新日志失败:', error);
  }
}

/**
 * 清理旧日志
 */
export async function cleanOldLogs(days = 30) {
  const db = getSupabase();

  const { data, error } = await db.rpc('clean_old_logs', { days_to_keep: days });

  if (error) {
    console.error('清理旧日志失败:', error);
    return 0;
  }

  return data || 0;
}
