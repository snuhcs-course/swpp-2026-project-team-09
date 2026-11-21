/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RunScore } from '../run-score.ts';
import { type CaseScore } from '../score.ts';
import { type Suite } from './report.ts';

// The P05 cases whose expected words a later change revised (suite.yaml, `revised`): a run runs the revision, and the
// report scores it in the frozen case's place.

// The ids of the frozen cases a run leaves out, since it runs their revisions in their place.
export function revisedCases(suite: Suite): Set<string> {
  return new Set((suite.revised ?? []).map(({ case: id }) => id));
}

// A run that holds a revised case's revision is scored on the revision in the frozen case's place, its tags included,
// and the frozen case is left out. A run saved before the revision holds only the frozen case and scores as it did.
export function inPlaceOfRevised(score: RunScore, suite: Suite): { every: CaseScore[]; idOf: (id: string) => string } {
  const held = new Set(score.cases.map(({ run }) => run.id));
  const revisions = new Map(
    (suite.revised ?? []).filter(({ heldBy }) => held.has(heldBy)).map(({ case: id, heldBy }) => [id, heldBy]),
  );
  return {
    every: score.cases.filter(({ run }) => !revisions.has(run.id)),
    idOf: (id) => revisions.get(id) ?? id,
  };
}
