import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.flow.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    // One stack for every flow, so the flows run one at a time.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
