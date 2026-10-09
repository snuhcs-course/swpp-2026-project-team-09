/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    unstubEnvs: true,
    globalSetup: ['test/global-setup.ts'],
    // Some tests start their own containers.
    hookTimeout: 60_000,
  },
});
