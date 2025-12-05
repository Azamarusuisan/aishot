export const DEFAULT_MAX_PAGES = 30;
export const DEFAULT_MAX_DEPTH = 2;
export const DEFAULT_OUTPUT_DIR = './screenshots';
export const DEFAULT_CONCURRENCY = 3;
export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export const VIEWPORT = {
  width: 1440,
  height: 900
};

export const EXCLUDED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.zip', '.tar', '.gz', '.rar', '.7z'
];

export const EXCLUDED_PATH_PATTERNS = [
  '/logout',
  '/admin',
  '/wp-admin',
  '/dashboard'
];
