#!/usr/bin/env node
/**
 * Check sitemap formats for a list of URLs.
 *
 * Usage:
 *   node scripts/check-sitemap-format.js path/to/sitemaps.json
 *   node scripts/check-sitemap-format.js --stdin
 *
 * Input formats:
 * - JSON array of strings: ["https://example.com/sitemap.xml", ...]
 * - JSON array of objects: [{ "url": "https://example.com/sitemap.xml" }, ...]
 * - When using --stdin: one URL per line
 */

import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';

function usage() {
  console.log(
    [
      'Usage:',
      '  node scripts/check-sitemap-format.js path/to/sitemaps.json',
      '  node scripts/check-sitemap-format.js --stdin',
      '',
      'Input formats:',
      '  - JSON array of strings',
      '  - JSON array of objects with a "url" field',
      '  - --stdin: one URL per line',
    ].join('\n')
  );
}

function normalizeList(input) {
  if (Array.isArray(input)) {
    return input
      .map(item => (typeof item === 'string' ? item : item?.url))
      .filter(Boolean);
  }
  return [];
}

function detectRootTag(xmlText) {
  const trimmed = xmlText.trimStart();
  const match = trimmed.match(/^<\?xml[^>]*\?>\s*<([a-zA-Z0-9:_-]+)/);
  if (match) return match[1].toLowerCase();
  const fallback = trimmed.match(/^<([a-zA-Z0-9:_-]+)/);
  return fallback ? fallback[1].toLowerCase() : null;
}

async function fetchSitemap(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0 (sitemap-checker)' },
  });

  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  const isGzip =
    url.endsWith('.gz') ||
    res.headers.get('content-encoding')?.includes('gzip') ||
    res.headers.get('content-type')?.includes('gzip');

  const text = isGzip ? gunzipSync(buf).toString('utf-8') : buf.toString('utf-8');

  return {
    ok: res.ok,
    status: res.status,
    contentType: res.headers.get('content-type') || '',
    text,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    usage();
    process.exit(1);
  }

  let urls = [];

  if (args[0] === '--stdin') {
    const input = fs.readFileSync(0, 'utf-8');
    urls = input
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  } else {
    const file = args[0];
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw);
    urls = normalizeList(parsed);
  }

  if (urls.length === 0) {
    console.log('No URLs found.');
    process.exit(1);
  }

  const results = [];

  for (const url of urls) {
    try {
      const res = await fetchSitemap(url);
      if (!res.ok) {
        results.push({ url, type: 'error', detail: `HTTP ${res.status}` });
        continue;
      }

      const root = detectRootTag(res.text);
      if (!root) {
        results.push({ url, type: 'unknown', detail: 'no root tag' });
        continue;
      }

      if (root.includes('sitemapindex')) {
        results.push({ url, type: 'sitemapindex', detail: root });
      } else if (root.includes('urlset')) {
        results.push({ url, type: 'urlset', detail: root });
      } else {
        results.push({ url, type: 'other-xml', detail: root });
      }
    } catch (err) {
      results.push({ url, type: 'error', detail: err?.message || String(err) });
    }
  }

  const byType = results.reduce((acc, r) => {
    acc[r.type] = acc[r.type] || [];
    acc[r.type].push(r);
    return acc;
  }, {});

  console.log('=== Summary ===');
  for (const type of Object.keys(byType).sort()) {
    console.log(`${type}: ${byType[type].length}`);
  }

  console.log('\n=== Details ===');
  for (const r of results) {
    console.log(`${r.type}\t${r.url}\t${r.detail || ''}`.trim());
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
