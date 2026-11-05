/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { launch } from './launch.ts';

// `pnpm eval:replay`: stages A, B and C on the gold set (eval/replay/replay.ts). See README.md, "Assistant".

process.exitCode = await launch('./eval/replay/replay.ts', process.argv.slice(2));
