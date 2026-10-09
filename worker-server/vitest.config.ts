// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #7
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
