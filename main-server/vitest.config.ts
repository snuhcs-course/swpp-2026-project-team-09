/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { configDefaults, defineConfig } from 'vitest/config';

// Waits for Redis to expire records in real time with 150 ms to spare, which the other files' load can use up.
const STORE_CONTRACT = 'test/redis-idempotency-store.integration.test.ts';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    unstubEnvs: true,
    // Some tests start their own containers.
    hookTimeout: 60_000,
    // Every worker opens its own connections to the one PostgreSQL, which refuses them past its limit on a machine
    // with many cores.
    maxWorkers: 8,
    // The global setup sits in the integration project, not here: Vitest runs the root's for every project. It
    // provides its settings to that project only, so the store contract starts its own Redis.
    projects: [
      { extends: true, test: { name: 'unit', include: ['test/**/*.unit.test.ts'] } },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/**/*.integration.test.ts'],
          exclude: [...configDefaults.exclude, STORE_CONTRACT],
          globalSetup: ['test/global-setup.ts'],
        },
      },
      {
        extends: true,
        test: { name: 'integration-store-contract', include: [STORE_CONTRACT], sequence: { groupOrder: 1 } },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/generated/**', '**/*.d.ts'],
      reporter: ['text-summary', 'json-summary', 'html', 'lcov'],
      reportOnFailure: true,
    },
  },
});
