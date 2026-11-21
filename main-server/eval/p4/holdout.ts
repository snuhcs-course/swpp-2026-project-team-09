/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { casesIn, type EvalCase, loadCases, type WorldName } from '../cases.ts';
import { p5Suite } from '../p5/report.ts';
import { revisedCases } from '../p5/revised.ts';

// The P4 holdout (P04 ticket 06): holdout.yaml's wordings over the suite's own cases. A holdout case is built from its
// original, so its world, clock, asker, history and answer cannot drift from it.

const HOLDOUT_FILE = new URL('holdout.yaml', import.meta.url);

const holdoutSchema = z.strictObject({
  draftedBy: z.string().min(1),
  draftedOn: z.iso.date(),
  reviewedBy: z.string().nullable(),
  reviewedOn: z.iso.date().nullable(),
  wordings: z.array(z.strictObject({ of: z.string().min(1), user: z.string().min(1) })).min(1),
});

export type Holdout = z.output<typeof holdoutSchema>;

export function p4Holdout(): Holdout {
  return holdoutSchema.parse(parse(readFileSync(HOLDOUT_FILE, 'utf8')));
}

// The case with its last User turn in other words.
function withLastTurn(original: EvalCase, user: string): EvalCase {
  return {
    ...original,
    id: `holdout-${original.id}`,
    turns: original.turns.map((turn, index) => (index === original.turns.length - 1 ? { ...turn, user } : turn)),
  };
}

// The holdout's cases, in the order of holdout.yaml, built from the suite's `cases`.
export function holdoutCases(cases: readonly EvalCase[], { wordings }: Holdout = p4Holdout()): EvalCase[] {
  return wordings.map(({ of, user }) => {
    const original = cases.find(({ id }) => id === of);
    if (original === undefined) {
      throw new Error(`The holdout rewords ${of}, which no case is`);
    }
    return withLastTurn(original, user);
  });
}

// What a run takes its cases from: its world's, or the holdout's, which no other path reaches. A run of P05's world runs
// a revised case's revision and leaves the frozen case out (eval/p5/suite.yaml, `revised`).
export function casesToRun({ world, holdout }: { world: WorldName; holdout?: true | undefined }): EvalCase[] {
  const revised = world === 'p5' ? revisedCases(p5Suite()) : new Set<string>();
  const cases = casesIn(loadCases(), world).filter(({ id }) => !revised.has(id));
  return holdout === true ? holdoutCases(cases) : cases;
}
