import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { takeScreenshotsWithProgress } from './screenshot.js';
import { isValidUrl, getHost, normalizeUrl, isSameHost, isSkippableLink } from './url-utils.js';
import * as cheerio from 'cheerio';
import {
  DEFAULT_MAX_PAGES,
  DEFAULT_MAX_DEPTH,
  DEFAULT_OUTPUT_DIR,
  DEFAULT_CONCURRENCY,
  DEFAULT_USER_AGENT
} from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '../public');

let lastOutputDir = DEFAULT_OUTPUT_DIR;
let lastHost = '';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res) {
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

async function handleCrawl(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const params = url.searchParams;

  const targetUrl = params.get('url');
  const maxPages = parseInt(params.get('maxPages')) || DEFAULT_MAX_PAGES;
  const maxDepth = parseInt(params.get('maxDepth')) || DEFAULT_MAX_DEPTH;
  const concurrency = parseInt(params.get('concurrency')) || DEFAULT_CONCURRENCY;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  if (!targetUrl || !isValidUrl(targetUrl)) {
    send({ type: 'error', message: '有効なURLを入力してください' });
    res.end();
    return;
  }

  if (maxPages < 1 || maxDepth < 1 || concurrency < 1) {
    send({ type: 'error', message: 'オプションの値が不正です' });
    res.end();
    return;
  }

  const host = getHost(targetUrl);
  lastHost = host;
  lastOutputDir = path.resolve(DEFAULT_OUTPUT_DIR, host);

  try {
    send({ type: 'log', message: `クロール開始: ${targetUrl}`, level: 'info' });
    send({ type: 'progress', current: 0, total: maxPages, status: 'クロール中...' });

    const pages = await crawlWithProgress(targetUrl, { maxPages, maxDepth, userAgent: DEFAULT_USER_AGENT }, send);

    if (pages.length === 0) {
      send({ type: 'error', message: 'クロール対象のページが見つかりませんでした' });
      res.end();
      return;
    }

    send({ type: 'log', message: `${pages.length} ページ発見`, level: 'success' });
    send({ type: 'progress', current: 0, total: pages.length, status: 'スクリーンショット撮影中...' });

    await takeScreenshotsWithProgress(pages, {
      outputDir: DEFAULT_OUTPUT_DIR,
      concurrency,
      userAgent: DEFAULT_USER_AGENT,
      host
    }, send);

    send({ type: 'complete', count: pages.length, outputDir: lastOutputDir, host });

  } catch (error) {
    send({ type: 'error', message: error.message });
  }

  res.end();
}

async function crawlWithProgress(startUrl, options, send) {
  const { maxPages, maxDepth, userAgent } = options;

  const visited = new Set();
  const queue = [];
  const results = [];

  const normalizedStart = normalizeUrl(startUrl);
  if (!normalizedStart) throw new Error('無効なURLです');

  queue.push({ url: normalizedStart, depth: 0 });
  visited.add(normalizedStart);

  while (queue.length > 0 && results.length < maxPages) {
    const { url, depth } = queue.shift();

    send({ type: 'log', message: `Crawl ${results.length + 1}/${maxPages} (depth=${depth}): ${url}`, level: 'info' });
    send({ type: 'progress', current: results.length, total: maxPages, status: 'クロール中...' });

    results.push({ url, depth });

    if (depth >= maxDepth) continue;

    try {
      await new Promise(r => setTimeout(r, 300));

      const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || isSkippableLink(href)) return;

        try {
          const abs = new URL(href, url).href;
          const norm = normalizeUrl(abs);
          if (!norm || visited.has(norm)) return;
          if (!isSameHost(norm, startUrl)) return;

          visited.add(norm);
          queue.push({ url: norm, depth: depth + 1 });
        } catch {}
      });

    } catch (error) {
      send({ type: 'log', message: `Error: ${url} - ${error.message}`, level: 'warning' });
    }
  }

  return results;
}

function handleOpenFolder(req, res) {
  const cmd = process.platform === 'darwin'
    ? `open "${lastOutputDir}"`
    : process.platform === 'win32'
    ? `explorer "${lastOutputDir}"`
    : `xdg-open "${lastOutputDir}"`;

  exec(cmd, (err) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: !err }));
  });
}

function handleGetImages(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const host = url.searchParams.get('host') || lastHost;
  const pcDir = path.join(DEFAULT_OUTPUT_DIR, host, 'pc');

  fs.readdir(pcDir, (err, files) => {
    if (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ images: [] }));
      return;
    }

    const images = files
      .filter(f => f.endsWith('.png'))
      .map(f => ({ name: f, url: `/api/image?host=${encodeURIComponent(host)}&file=${encodeURIComponent(f)}` }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ images }));
  });
}

function handleServeImage(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const host = url.searchParams.get('host');
  const file = url.searchParams.get('file');

  if (!host || !file) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const filePath = path.join(DEFAULT_OUTPUT_DIR, host, 'pc', file);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(content);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/crawl' && req.method === 'GET') {
    handleCrawl(req, res);
  } else if (url.pathname === '/api/open-folder' && req.method === 'POST') {
    handleOpenFolder(req, res);
  } else if (url.pathname === '/api/images' && req.method === 'GET') {
    handleGetImages(req, res);
  } else if (url.pathname === '/api/image' && req.method === 'GET') {
    handleServeImage(req, res);
  } else {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
