/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Browser } from './browser-pages.js';
import { USER_AGENT } from './page-fetcher.js';

// A site's waiting room can hold a page for a while.
const PAGE_TIMEOUT = 60_000;

// A redirect out of a waiting room can come just after the network goes quiet.
const AFTER_NETWORK_IDLE = 500;

// What a parser does not read, left out to take less memory and less of the site's bandwidth.
const NOT_LOADED = new Set(['image', 'media', 'font']);

// The real browser, which only the Dockerfile's image and `playwright install` provide, so no test starts it.
export async function launchChromium(): Promise<Browser> {
  // Imported here, so that a worker with no Collection to run does not load it.
  const { chromium } = await import('playwright');
  // A container's /dev/shm is too small for Chromium: without this flag, a page can crash it.
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  try {
    const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'ko-KR' });
    await context.route('**/*', (route) =>
      NOT_LOADED.has(route.request().resourceType()) ? route.abort() : route.continue(),
    );
    const page = await context.newPage();
    return {
      open: async (url) => {
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: PAGE_TIMEOUT });
        if (response !== null && !response.ok()) {
          throw new Error(`${url} answered ${response.status()}`);
        }
        await page.waitForTimeout(AFTER_NETWORK_IDLE);
        return { url: page.url(), html: await page.content() };
      },
      close: () => browser.close(),
    };
  } catch (error) {
    // BrowserPages closes only a browser it was given, and a repeated failure would leave one for each Collection.
    await browser.close();
    throw error;
  }
}
