/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type RulesFile } from '../eval/replay/induced.ts';

// A rules file as `pnpm eval:induce` writes one (P07 ticket 07), induced at `asOf` from the words given, with the one
// rule that drops a leading 뷁, for the replay's tests.
export function rulesFile(asOf: Date, trainedWords: string[]): string {
  const file: RulesFile = {
    asOf: asOf.toISOString(),
    model: 'test/model',
    budget: 1,
    seed: 1,
    trainedWords,
    rules: [
      {
        kind: 'words',
        pattern: '^뷁(.+)$',
        replace: '$1',
        example: '뷁학생회관',
        fixed: 2,
        broke: 0,
        accounts: 2,
        heldOutGain: 0,
      },
    ],
    trace: null,
  };
  const path = join(mkdtempSync(join(tmpdir(), 'induced-')), 'rules.json');
  writeFileSync(path, JSON.stringify(file));
  return path;
}
