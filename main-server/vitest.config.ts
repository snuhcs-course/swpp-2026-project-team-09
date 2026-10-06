import { configDefaults, defineConfig } from 'vitest/config';

// Waits for Redis to expire records in real time with 150 ms to spare, which the other files' load can use up.
const STORE_CONTRACT = 'test/redis-idempotency-store.e2e-spec.ts';

const shared = {
  globals: true,
  unstubEnvs: true,
  // Some tests start their own containers.
  hookTimeout: 60_000,
};

// The projects do not extend this config: with `extends: true` each would run the global setup and start containers
// of its own. It runs once, here, and every project gets what it provides.
export default defineConfig({
  test: {
    root: './',
    globalSetup: ['test/global-setup.ts'],
    // Every worker opens its own connections to the one PostgreSQL, which refuses them past its limit on a machine
    // with many cores.
    maxWorkers: 8,
    projects: [
      {
        test: {
          ...shared,
          name: 'e2e',
          include: ['test/**/*.e2e-spec.ts'],
          exclude: [...configDefaults.exclude, STORE_CONTRACT],
        },
      },
      { test: { ...shared, name: 'store-contract', include: [STORE_CONTRACT], sequence: { groupOrder: 1 } } },
    ],
  },
});
