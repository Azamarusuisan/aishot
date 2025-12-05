#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { crawlSite } from './crawler.js';
import { takeScreenshots } from './screenshot.js';
import { isValidUrl, getHost } from './url-utils.js';
import {
  DEFAULT_MAX_PAGES,
  DEFAULT_MAX_DEPTH,
  DEFAULT_OUTPUT_DIR,
  DEFAULT_CONCURRENCY,
  DEFAULT_USER_AGENT
} from './config.js';

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <startUrl> [options]')
  .command('$0 <startUrl>', 'サイトをクロールしてスクリーンショットを撮影')
  .positional('startUrl', {
    describe: 'クロール開始URL',
    type: 'string'
  })
  .option('max-pages', {
    describe: 'クロールする最大ページ数',
    type: 'number',
    default: DEFAULT_MAX_PAGES
  })
  .option('max-depth', {
    describe: 'クロールの最大深さ',
    type: 'number',
    default: DEFAULT_MAX_DEPTH
  })
  .option('out', {
    describe: 'スクリーンショット保存先ディレクトリ',
    type: 'string',
    default: DEFAULT_OUTPUT_DIR
  })
  .option('concurrency', {
    describe: '同時スクリーンショット撮影数',
    type: 'number',
    default: DEFAULT_CONCURRENCY
  })
  .option('user-agent', {
    describe: 'リクエスト時のUser-Agent',
    type: 'string',
    default: DEFAULT_USER_AGENT
  })
  .help()
  .argv;

async function main() {
  const startUrl = argv.startUrl;
  const maxPages = argv['max-pages'];
  const maxDepth = argv['max-depth'];
  const outputDir = argv.out;
  const concurrency = argv.concurrency;
  const userAgent = argv['user-agent'];

  if (!isValidUrl(startUrl)) {
    console.error('エラー: 無効なURLです。http:// または https:// で始まるURLを指定してください。');
    process.exit(1);
  }

  if (!Number.isInteger(maxPages) || maxPages < 1) {
    console.error('エラー: --max-pages は1以上の整数を指定してください。');
    process.exit(1);
  }

  if (!Number.isInteger(maxDepth) || maxDepth < 1) {
    console.error('エラー: --max-depth は1以上の整数を指定してください。');
    process.exit(1);
  }

  if (!Number.isInteger(concurrency) || concurrency < 1) {
    console.error('エラー: --concurrency は1以上の整数を指定してください。');
    process.exit(1);
  }

  const host = getHost(startUrl);

  console.log('='.repeat(50));
  console.log('Site Screenshot Crawler');
  console.log('='.repeat(50));
  console.log(`Target: ${startUrl}`);
  console.log(`Max Pages: ${maxPages}`);
  console.log(`Max Depth: ${maxDepth}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log('='.repeat(50));

  try {
    const pages = await crawlSite(startUrl, {
      maxPages,
      maxDepth,
      userAgent
    });

    if (pages.length === 0) {
      console.log('クロール対象のページが見つかりませんでした。');
      process.exit(0);
    }

    await takeScreenshots(pages, {
      outputDir,
      concurrency,
      userAgent,
      host
    });

    console.log('='.repeat(50));
    console.log('完了しました！');
    console.log(`${pages.length} ページのスクリーンショットを保存しました。`);
    console.log('='.repeat(50));
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    process.exit(1);
  }
}

main();
