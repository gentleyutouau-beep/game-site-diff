/**
 * 健康检查 API 端点
 */

export default async function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'sitemap-diff',
    version: '2.0.0',
    runtime: 'vercel'
  });
}
