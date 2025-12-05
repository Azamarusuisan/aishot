import crypto from 'crypto';
import { EXCLUDED_EXTENSIONS, EXCLUDED_PATH_PATTERNS } from './config.js';

/**
 * URLを正規化する（末尾スラッシュ、ハッシュ除去など）
 */
export function normalizeUrl(urlString) {
  try {
    const url = new URL(urlString);
    url.hash = '';
    let pathname = url.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    url.pathname = pathname;
    return url.href;
  } catch {
    return null;
  }
}

/**
 * 2つのURLが同じホストかどうかを判定
 */
export function isSameHost(urlString, baseUrlString) {
  try {
    const url = new URL(urlString);
    const baseUrl = new URL(baseUrlString);
    return url.host === baseUrl.host && url.protocol === baseUrl.protocol;
  } catch {
    return false;
  }
}

/**
 * スキップすべきリンクかどうかを判定
 */
export function isSkippableLink(href) {
  if (!href) return true;

  const trimmed = href.trim().toLowerCase();

  if (trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('javascript:')) {
    return true;
  }

  try {
    const url = new URL(href, 'http://dummy.com');
    const pathname = url.pathname.toLowerCase();

    for (const ext of EXCLUDED_EXTENSIONS) {
      if (pathname.endsWith(ext)) {
        return true;
      }
    }

    const fullPath = pathname + url.search;
    for (const pattern of EXCLUDED_PATH_PATTERNS) {
      if (fullPath.includes(pattern)) {
        return true;
      }
    }
  } catch {
    return true;
  }

  return false;
}

/**
 * URLからスクリーンショット用のスラッグを生成
 */
export function createSlugFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    let slug = url.pathname + url.search;

    slug = slug
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/\?/g, '-')
      .replace(/&/g, '-')
      .replace(/=/g, '-')
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .replace(/-+/g, '-')
      .replace(/_+/g, '_')
      .replace(/^[-_]+/, '')
      .replace(/[-_]+$/, '');

    if (!slug) {
      slug = 'index';
    }

    const MAX_LENGTH = 100;
    if (slug.length > MAX_LENGTH) {
      const hash = crypto.createHash('sha1').update(urlString).digest('hex').slice(0, 8);
      slug = slug.slice(0, MAX_LENGTH - 9) + '-' + hash;
    }

    return slug;
  } catch {
    return 'unknown';
  }
}

/**
 * URLからホスト名を取得
 */
export function getHost(urlString) {
  try {
    const url = new URL(urlString);
    return url.host;
  } catch {
    return 'unknown';
  }
}

/**
 * URLが有効かどうかを検証
 */
export function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
