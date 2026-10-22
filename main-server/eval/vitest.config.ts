/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The benchmark's own Vitest project, which only `pnpm eval` starts (eval/cli.ts): it calls the real model, so
// `pnpm test` and CI, which use vitest.config.ts, never include it. It reuses the e2e global setup: fresh PostgreSQL
// and Redis, migrated and with the Places seed.
export default defineConfig({
  test: {
    name: 'eval',
    root: fileURLToPath(new URL('..', import.meta.url)),
    include: ['eval/**/*.eval.ts'],
    globalSetup: ['test/global-setup.ts'],
    globals: true,
    unstubEnvs: true,
    hookTimeout: 120_000,
    // One case at a time, in order, so that the budget is checked between them.
    fileParallelism: false,
    maxWorkers: 1,
    sequence: { concurrent: false },
  },
});
