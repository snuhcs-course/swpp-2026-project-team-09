/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { saveScorecard } from './scorecard.ts';

// `pnpm eval:score <run.json>...`: scores saved raw runs again and writes each one's scorecard beside it, as
// <run>.md. It never calls the model. See README.md, "Benchmark".

function main(files: string[]): number {
  if (files.length === 0) {
    console.error('Usage: pnpm eval:score <run.json>...');
    return 1;
  }
  for (const file of files) {
    console.log(fileURLToPath(saveScorecard(pathToFileURL(resolve(file)))));
  }
  return 0;
}

process.exitCode = main(process.argv.slice(2));
