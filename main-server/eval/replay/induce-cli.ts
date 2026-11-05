/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { launch } from './launch.ts';

// `pnpm eval:induce`: matching rules induced from a database's rows into a file (eval/replay/induce.ts). See README.md,
// "Assistant". It calls the model.

process.exitCode = await launch('./eval/replay/induce.ts', process.argv.slice(2));
