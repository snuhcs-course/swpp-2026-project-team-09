/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    unstubEnvs: true,
    // Some tests start their own containers.
    hookTimeout: 60_000,
    // The global setup sits in the integration project, not here: Vitest runs the root's for every project.
    projects: [
      { extends: true, test: { name: 'unit', include: ['test/**/*.unit.test.ts'] } },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/**/*.integration.test.ts'],
          globalSetup: ['test/global-setup.ts'],
        },
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
