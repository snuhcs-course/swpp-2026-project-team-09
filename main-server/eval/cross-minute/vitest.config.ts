/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The Vitest project of the cross-minute cache measurement, which only `pnpm eval:cross-minute` starts: it calls the
// real model, so `pnpm test` and CI never include it. It has no database.
export default defineConfig({
  test: {
    name: 'eval-cross-minute',
    root: fileURLToPath(new URL('../..', import.meta.url)),
    include: ['eval/cross-minute/measure.run.ts'],
    globals: true,
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 10 * 60 * 1000,
  },
  server: { fs: { strict: false } },
});
