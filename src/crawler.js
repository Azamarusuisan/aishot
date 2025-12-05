import * as cheerio from 'cheerio';
import { normalizeUrl, isSameHost, isSkippableLink } from './url-utils.js';

const FETCH_DELAY = 300;

/**
 * 指定したURLからHTMLを取得
 */
async function fetchHtml(url, userAgent) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': userAgent
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    throw new Error('Not HTML content');
  }

  return await response.text();
}

/**
 * HTMLからリンクを抽出
 */
function extractLinks(html, baseUrl) {
  const $ = cheerio.load(html);
  const links = new Set();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;

    if (isSkippableLink(href)) return;

    try {
      const absoluteUrl = new URL(href, baseUrl).href;
      const normalized = normalizeUrl(absoluteUrl);
      if (normalized) {
        links.add(normalized);
      }
    } catch {
      // 無効なURLは無視
    }
  });

  return Array.from(links);
}

/**
 * サイトをクロールしてURL一覧を取得
 */
export async function crawlSite(startUrl, options = {}) {
  const { maxPages, maxDepth, userAgent } = options;

  const visited = new Set();
  const queue = [];
  const results = [];

  const normalizedStart = normalizeUrl(startUrl);
  if (!normalizedStart) {
    throw new Error('無効な起点URLです');
  }

  queue.push({ url: normalizedStart, depth: 0 });
  visited.add(normalizedStart);

  console.log(`Starting crawl: ${normalizedStart}`);

  while (queue.length > 0 && results.length < maxPages) {
    const { url, depth } = queue.shift();

    console.log(`Crawl ${results.length + 1}/${maxPages} (depth=${depth}): ${url}`);

    results.push({ url, depth });

    if (depth >= maxDepth) {
      continue;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY));

      const html = await fetchHtml(url, userAgent);
      const links = extractLinks(html, url);

      for (const link of links) {
        if (visited.has(link)) continue;

        if (!isSameHost(link, startUrl)) {
          continue;
        }

        visited.add(link);
        queue.push({ url: link, depth: depth + 1 });

        if (visited.size >= maxPages * 2) {
          break;
        }
      }
    } catch (error) {
      console.warn(`Error on ${url}: ${error.message}`);
    }

    if (results.length >= maxPages) {
      console.log(`Max pages reached (${maxPages}). Stopping crawl.`);
      break;
    }
  }

  console.log(`Crawl complete. Found ${results.length} pages.`);

  return results;
}
