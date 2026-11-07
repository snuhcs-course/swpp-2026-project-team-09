/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type EvalCase, loadCases } from './cases.ts';
import { isRecord } from './readers.ts';

// A saved run with each case's labels as the case files hold them now, in the place of those the run recorded: its
// `expect`, each turn's and its known failure, as the runner writes them (eval/runner.ts). So a run is scored again
// after a label's `revises:` (eval/p6/suite.yaml, revisions) without calling the model. A case the files no longer hold
// fails, so that a run is never scored against labels it did not have.
export function withCurrentLabels(written: unknown, cases: readonly EvalCase[] = loadCases()): unknown {
  if (!isRecord(written) || !Array.isArray(written.cases)) {
    return written;
  }
  const byId = new Map(cases.map((evalCase) => [evalCase.id, evalCase]));
  return {
    ...written,
    cases: written.cases.map((run: unknown) => {
      const id = isRecord(run) ? run.id : undefined;
      const evalCase = typeof id === 'string' ? byId.get(id) : undefined;
      if (!isRecord(run) || evalCase === undefined) {
        throw new Error(`The case ${String(id)} of the run is in no case file`);
      }
      const userTurns = evalCase.turns.flatMap((turn) => ('user' in turn ? [turn] : []));
      return {
        ...run,
        knownFailure: evalCase.knownFailure ?? evalCase.expect?.knownFailure ?? null,
        expect: evalCase.expect ?? null,
        turnExpects: userTurns.map(({ expect }) => expect ?? null),
      };
    }),
  };
}
