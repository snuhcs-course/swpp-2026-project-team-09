/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// `pnpm test:admin-ui`: the admin site in a browser, on the flow stack with the admin site over it.
export default defineConfig({
  test: {
    root: fileURLToPath(new URL('../..', import.meta.url)),
    globals: true,
    include: ['test/admin-ui/**/*.e2e.test.ts'],
    globalSetup: ['test/admin-ui/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 60_000,
    reporters: ['default', 'junit'],
    outputFile: { junit: 'admin-ui-results/junit.xml' },
  },
});
