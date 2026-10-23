/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e.test.ts', 'test/**/*.integration.test.ts'],
    // The admin site's browser tests need a browser and the admin image, so they stay out of `pnpm test`.
    exclude: ['test/admin-ui/**'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    // One stack for every flow, so the flows run one at a time.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
