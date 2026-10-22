/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { inject, it as base } from 'vitest';
import { WAIT_MS } from '../inbox.js';
import { GOOGLE_SCRIPT, standInForGoogle } from './google.js';

// A test whose `page` is a headless Chromium tab on the admin site, in a time zone far from Seoul, so that a time read
// in the browser's zone fails. The page accepts every `window.confirm`. A request to another host than the site's is
// aborted and fails the test. A failed test leaves a screenshot and a Playwright trace in admin-ui-results/failures/.
export const it = base.extend<{ page: Page }>({
  page: async ({ task, onTestFinished }, use) => {
    const site = new URL(inject('adminSite'));
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ baseURL: site.origin, timezoneId: 'America/Los_Angeles' });
    context.setDefaultTimeout(WAIT_MS);
    const outside: string[] = [];
    // Not thrown from the clean-up below, which Vitest would report twice.
    onTestFinished(() => {
      if (outside.length > 0) {
        throw new Error(`The browser asked for addresses outside the site, which were aborted: ${outside.join(', ')}`);
      }
    });
    await context.route(
      (url) => url.origin !== site.origin && url.href !== GOOGLE_SCRIPT,
      (route) => {
        outside.push(route.request().url());
        return route.abort('blockedbyclient');
      },
    );
    await standInForGoogle(context);
    await context.tracing.start({ screenshots: true, snapshots: true });
    const page = await context.newPage();
    page.on('dialog', (dialog) => void dialog.accept());

    await use(page);

    try {
      if (task.result?.state === 'fail' || outside.length > 0) {
        const named = join(inject('adminUiFailures'), task.name.replaceAll(/\W+/gu, '-'));
        mkdirSync(inject('adminUiFailures'), { recursive: true });
        await page.screenshot({ path: `${named}.png`, fullPage: true });
        await context.tracing.stop({ path: `${named}-trace.zip` });
      } else {
        await context.tracing.stop();
      }
    } finally {
      await browser.close();
    }
  },
});
