/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { saveScorecard } from './scorecard.ts';

// `pnpm eval:score [--revised] <run.json>...`: scores saved raw runs again and writes each one's scorecard beside it,
// as <run>.md. With --revised, it scores them against the case files' labels as they are now, revisions included, in
// the place of the labels each run recorded, and writes <run>.revised.md. It never calls the model. See README.md,
// "Benchmark".

function main(args: string[]): number {
  const revised = args.includes('--revised');
  const files = args.filter((arg) => arg !== '--revised');
  if (files.length === 0) {
    console.error('Usage: pnpm eval:score [--revised] <run.json>...');
    return 1;
  }
  for (const file of files) {
    console.log(fileURLToPath(saveScorecard(pathToFileURL(resolve(file)), { revised })));
  }
  return 0;
}

process.exitCode = main(process.argv.slice(2));
