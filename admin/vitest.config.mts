import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': 'next/dist/compiled/server-only/empty.js' },
  },
  test: {
    globals: true,
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'pages',
          environment: 'jsdom',
          // Far from Seoul, so that a time shown in the browser's zone instead of Seoul's fails.
          env: { TZ: 'America/Los_Angeles' },
          include: ['__tests__/*.test.tsx'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'site',
          environment: 'node',
          include: ['__tests__/site/*.test.ts'],
          globalSetup: ['./__tests__/site/build.ts'],
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
