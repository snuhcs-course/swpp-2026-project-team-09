/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { launch } from './launch.ts';

// `pnpm eval:suggestions`: the grey suggestions' acceptance curves (eval/replay/suggestions.ts). See README.md, "Assistant".

process.exitCode = await launch('./eval/replay/suggestions.ts', process.argv.slice(2));
