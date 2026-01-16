-- Sitemap Diff - Supabase Schema
-- 用于存储 sitemap 监控数据

-- 订阅源表
CREATE TABLE IF NOT EXISTS feeds (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sitemap 内容表（存储当前和历史版本）
CREATE TABLE IF NOT EXISTS sitemaps (
    id SERIAL PRIMARY KEY,
    domain TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('current', 'latest')),
    content TEXT,
    url_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(domain, type)
);

-- 更新记录表（记录每次检查的结果）
CREATE TABLE IF NOT EXISTS update_logs (
    id SERIAL PRIMARY KEY,
    domain TEXT NOT NULL,
    new_urls_count INTEGER DEFAULT 0,
    new_urls JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_feeds_domain ON feeds(domain);
CREATE INDEX IF NOT EXISTS idx_sitemaps_domain ON sitemaps(domain);
CREATE INDEX IF NOT EXISTS idx_update_logs_checked_at ON update_logs(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_update_logs_domain ON update_logs(domain);

-- 启用 RLS
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitemaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_logs ENABLE ROW LEVEL SECURITY;

-- 公开读取策略
CREATE POLICY "Allow public read on feeds" ON feeds FOR SELECT USING (true);
CREATE POLICY "Allow public read on sitemaps" ON sitemaps FOR SELECT USING (true);
CREATE POLICY "Allow public read on update_logs" ON update_logs FOR SELECT USING (true);

-- 服务端写入策略
CREATE POLICY "Allow service write on feeds" ON feeds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write on sitemaps" ON sitemaps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service write on update_logs" ON update_logs FOR ALL USING (true) WITH CHECK (true);

-- 清理旧日志的函数
CREATE OR REPLACE FUNCTION clean_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM update_logs
    WHERE checked_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
