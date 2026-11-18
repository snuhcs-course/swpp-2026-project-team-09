/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// P15-52's experiment on reading timetable screenshots, which calls the real model: only `pnpm eval:timetable`
// starts it, never `pnpm test` or CI. It needs no database.
export default defineConfig({
  test: {
    name: 'timetable-reading',
    root: fileURLToPath(new URL('../..', import.meta.url)),
    include: ['eval/timetable-reading/*.experiment.ts'],
    globals: true,
    testTimeout: 1_800_000,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
