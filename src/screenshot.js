import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { createSlugFromUrl } from './url-utils.js';
import { VIEWPORT } from './config.js';

const SCREENSHOT_DELAY = 2000;

/**
 * 指定されたページ群のスクリーンショットを撮影
 */
export async function takeScreenshots(pages, options = {}) {
  const { outputDir, concurrency, userAgent, host } = options;

  const pcDir = path.join(outputDir, host, 'pc');
  await fs.mkdir(pcDir, { recursive: true });

  console.log(`Starting screenshots. Output: ${pcDir}`);

  const browser = await chromium.launch();

  const processPage = async (pageInfo) => {
    const { url } = pageInfo;
    const context = await browser.newContext({
      viewport: VIEWPORT,
      userAgent
    });

    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(SCREENSHOT_DELAY);

      const slug = createSlugFromUrl(url);
      const filename = `${slug}.png`;
      const filepath = path.join(pcDir, filename);

      await page.screenshot({
        path: filepath,
        fullPage: true
      });

      console.log(`Screenshot saved: ${filepath}`);
    } catch (error) {
      console.warn(`Error taking screenshot of ${url}: ${error.message}`);
    } finally {
      await page.close();
      await context.close();
    }
  };

  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency);
    await Promise.all(batch.map(processPage));
  }

  await browser.close();

  console.log('All screenshots completed.');
}

/**
 * 進捗コールバック付きでスクリーンショットを撮影（Web UI用）
 */
export async function takeScreenshotsWithProgress(pages, options = {}, send) {
  const { outputDir, concurrency, userAgent, host } = options;

  const pcDir = path.join(outputDir, host, 'pc');
  await fs.mkdir(pcDir, { recursive: true });

  send({ type: 'log', message: `保存先: ${pcDir}`, level: 'info' });

  const browser = await chromium.launch();
  let completed = 0;

  const processPage = async (pageInfo) => {
    const { url } = pageInfo;
    const context = await browser.newContext({
      viewport: VIEWPORT,
      userAgent
    });

    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(SCREENSHOT_DELAY);

      const slug = createSlugFromUrl(url);
      const filename = `${slug}.png`;
      const filepath = path.join(pcDir, filename);

      await page.screenshot({
        path: filepath,
        fullPage: true
      });

      completed++;
      send({
        type: 'log',
        message: `Screenshot: ${filename}`,
        level: 'success'
      });
      send({
        type: 'progress',
        current: completed,
        total: pages.length,
        status: 'スクリーンショット撮影中...'
      });

    } catch (error) {
      completed++;
      send({
        type: 'log',
        message: `Error: ${url} - ${error.message}`,
        level: 'error'
      });
    } finally {
      await page.close();
      await context.close();
    }
  };

  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency);
    await Promise.all(batch.map(processPage));
  }

  await browser.close();
}
