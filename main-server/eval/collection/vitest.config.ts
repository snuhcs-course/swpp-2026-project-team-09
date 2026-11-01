/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The Vitest project of evaluations A and B, which only `pnpm eval:collection` starts: it may call the real model, so
// `pnpm test` and CI never include it. It has no database.
export default defineConfig({
  test: {
    name: 'eval-collection',
    root: fileURLToPath(new URL('../..', import.meta.url)),
    include: ['eval/collection/one.run.ts'],
    globals: true,
    fileParallelism: false,
    maxWorkers: 1,
    // A real run takes some minutes, one call at a time, and a budget stops it first.
    testTimeout: 60 * 60 * 1000,
  },
  server: { fs: { strict: false } },
});
