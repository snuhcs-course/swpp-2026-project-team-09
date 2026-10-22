/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': 'next/dist/compiled/server-only/empty.js' },
  },
  test: {
    globals: true,
    restoreMocks: true,
    unstubEnvs: true,
    // So that `pnpm test:unit` passes before the unit project has a test file.
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['__tests__/**/*.unit.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration-pages',
          environment: 'jsdom',
          // Far from Seoul, so that a time shown in the browser's zone instead of Seoul's fails.
          env: { TZ: 'America/Los_Angeles', NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY: '' },
          include: ['__tests__/*.integration.test.tsx'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration-site',
          environment: 'node',
          include: ['__tests__/site/*.integration.test.ts'],
          globalSetup: ['./__tests__/site/build.ts'],
          hookTimeout: 30_000,
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
