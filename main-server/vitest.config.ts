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
