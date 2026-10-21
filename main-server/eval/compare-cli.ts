/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { compare } from './compare.ts';
import { type RunScore, scoreRun } from './run-score.ts';

// `pnpm eval:compare <a.json> <b.json>`: scores two saved raw runs and prints them side by side with their
// differences, the regressions and the fixed cases. It never calls the model. See README.md, "Benchmark".

function scored(file: string): RunScore {
  return scoreRun(JSON.parse(readFileSync(file, 'utf8')));
}

function main(files: string[]): number {
  const [a, b] = files;
  if (files.length !== 2 || a === undefined || b === undefined) {
    console.error('Usage: pnpm eval:compare <a.json> <b.json>');
    return 1;
  }
  console.log(compare(scored(a), scored(b)));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
