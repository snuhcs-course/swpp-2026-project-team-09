/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The walking evaluation's metric and threshold (P04's evidence/01) under ±2 minutes and under the tolerance revised on
// 2026-11-05 (P11's evidence/01), with the walking diagnostics (P04's evidence/06).

const TWO_MINUTES = 120;
const PERCENT_WITHIN = 70;
// The pairs where the table and the baseline differed by more than 2 minutes at the freeze.
export const TELLING_PAIRS = ['5', '11', '15', '20', '22', '23', '24', '27'];

export interface TestWalk {
  pair: string;
  walked: number;
  table: number;
  baseline: number;
}

export interface PredictionScore {
  mae: number;
  withinTwoMinutes: string[];
  withinRevised: string[];
  // Walked more than 2 minutes longer than predicted.
  late: string[];
  tellingMae: number;
}

export interface WalkingScore {
  table: PredictionScore;
  baseline: PredictionScore;
  k: number;
  verdicts: { twoMinutes: boolean; revised: boolean };
}

export function withinTwoMinutes(predicted: number, walked: number): boolean {
  return Math.abs(predicted - walked) <= TWO_MINUTES;
}

export function withinRevisedTolerance(predicted: number, walked: number): boolean {
  return Math.abs(predicted - walked) <= Math.min(0.25 * walked, TWO_MINUTES);
}

function mae(walks: readonly TestWalk[], prediction: 'table' | 'baseline'): number {
  return walks.reduce((sum, walk) => sum + Math.abs(walk[prediction] - walk.walked), 0) / walks.length;
}

function pairsWhere(walks: readonly TestWalk[], holds: (walk: TestWalk) => boolean): string[] {
  return walks.filter((walk) => holds(walk)).map(({ pair }) => pair);
}

function scorePrediction(walks: readonly TestWalk[], prediction: 'table' | 'baseline'): PredictionScore {
  return {
    mae: mae(walks, prediction),
    withinTwoMinutes: pairsWhere(walks, (walk) => withinTwoMinutes(walk[prediction], walk.walked)),
    withinRevised: pairsWhere(walks, (walk) => withinRevisedTolerance(walk[prediction], walk.walked)),
    late: pairsWhere(walks, (walk) => walk.walked - walk[prediction] > TWO_MINUTES),
    tellingMae: mae(
      walks.filter(({ pair }) => TELLING_PAIRS.includes(pair)),
      prediction,
    ),
  };
}

export function scoreWalks(walks: readonly TestWalk[]): WalkingScore {
  const table = scorePrediction(walks, 'table');
  const baseline = scorePrediction(walks, 'baseline');
  const meets = (within: readonly string[]): boolean =>
    100 * within.length >= PERCENT_WITHIN * walks.length && table.mae < baseline.mae;
  const sum = (term: (walk: TestWalk) => number): number => walks.reduce((total, walk) => total + term(walk), 0);
  return {
    table,
    baseline,
    k: sum(({ walked, table: seconds }) => walked * seconds) / sum(({ table: seconds }) => seconds ** 2),
    verdicts: { twoMinutes: meets(table.withinTwoMinutes), revised: meets(table.withinRevised) },
  };
}
