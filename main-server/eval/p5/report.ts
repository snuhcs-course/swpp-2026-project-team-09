/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { type Expect, expectSchema } from '../expect.ts';
import { cardsOf, type Names, namesOf } from '../normalise.ts';
import { type RunScore } from '../run-score.ts';
import { type CaseScore, type ScoredTurn } from '../score.ts';

// The P05 suite's numbers (metrics document, 2 C and D): what a saved run scored, read by the tags and thresholds of
// suite.yaml, with each threshold's pass or fail. It reads only the scorer's output, so a stored run is scored again
// without the model. k/n counts runs. A subset's cards are summed over its repetitions (micro), with the mean over its
// cases beside them, since a case with many cards weighs more in the sum.

// A tag is a case, or a (case, seed) pair once the case's answers are in.
const tagSchema = z.union([z.string(), z.strictObject({ case: z.string(), seed: z.string().nullable() })]);

const thresholdSchema = z.looseObject({
  metric: z.string(),
  kind: z.enum(['floor', 'target']),
  comparator: z.enum(['>=', '<=', '=']),
  value: z.number(),
});

export const suiteSchema = z.looseObject({
  world: z.literal('p5'),
  tags: z.record(z.string(), z.array(tagSchema)),
  thresholds: z.array(thresholdSchema),
});

export type Suite = z.output<typeof suiteSchema>;
type Threshold = Suite['thresholds'][number];

export function p5Suite(): Suite {
  return suiteSchema.parse(parse(readFileSync(new URL('suite.yaml', import.meta.url), 'utf8')));
}

export interface Measured {
  k: number;
  n: number;
}

export interface Verdict extends Threshold {
  passed: boolean | null;
}

export interface MetricScore extends Measured {
  metric: string;
  verdicts: Verdict[];
}

export interface CardScore {
  shown: number;
  right: number;
  expected: number;
}

export interface SubsetScore extends CardScore {
  subset: string;
  cases: number;
  // The mean over its cases of each case's precision and recall, null where no case has a denominator.
  meanPrecision: number | null;
  meanRecall: number | null;
  // Runs whose cards are exactly the answer's.
  exact: Measured;
}

export interface P5Report {
  metrics: MetricScore[];
  subsets: SubsetScore[];
  // Cases that passed all their runs.
  stable: Measured;
}

const CARD_SUBSETS = ['L', 'P', 'T1', 'T2', 'H', 'S', 'N', 'R', 'O', 'B', 'V', 'E'] as const;
const E3_SUBSETS = ['P', 'T1'];
const E7_SUBSETS = ['T2', 'H', 'S', 'N', 'R', 'O', 'B'];

// The words a reply must not hold in a join: it never says the asker has joined or asked.
export const FALSE_JOIN_WORDS = ['참여했', '참여 완료', '가입했', '신청했', '신청 완료'];

// The search conditions that narrow what a User did not state; a period counts only when shorter than the next 7 days.
const CONDITION_ARGS = ['board', 'place', 'placeId', 'radius', 'capacity', 'minPlacesLeft', 'after', 'before'];
const WEEK_MS = 6 * 24 * 60 * 60 * 1000;

const caseOfTag = (tag: Suite['tags'][string][number]): string => (typeof tag === 'string' ? tag : tag.case);

function lastTurnOf({ turns }: CaseScore): ScoredTurn | undefined {
  return turns.at(-1);
}

function expectOfRun({ run }: CaseScore): Expect | null {
  const written = run.turnExpects.at(-1) ?? run.expect;
  return written === null || written === undefined ? null : expectSchema.parse(written);
}

function checkPassed(scored: CaseScore, name: string): boolean {
  return lastTurnOf(scored)?.score?.checks.find((check) => check.name === name)?.passed === true;
}

const key = (kind: string, name: string): string => `${kind}/${name}`;

function shownOf(scored: CaseScore, names: Names): Set<string> {
  const cards = lastTurnOf(scored)?.trace?.reply?.cards ?? [];
  return new Set(cardsOf(cards, names).map(({ kind, name }) => key(kind, name)));
}

function expectedOf(scored: CaseScore): Set<string> {
  const groups = expectOfRun(scored)?.cards ?? [];
  return new Set(groups.flatMap(({ kind, seeds }) => seeds.map((seed) => key(kind, seed))));
}

export function cardScoreOf(scored: CaseScore, names: Names): CardScore {
  const shown = shownOf(scored, names);
  const expected = expectedOf(scored);
  return { shown: shown.size, right: [...shown].filter((card) => expected.has(card)).length, expected: expected.size };
}

function sumCards(scores: readonly CardScore[]): CardScore {
  return scores.reduce(
    (total, { shown, right, expected }) => ({
      shown: total.shown + shown,
      right: total.right + right,
      expected: total.expected + expected,
    }),
    { shown: 0, right: 0, expected: 0 },
  );
}

function meanOf(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((total, value) => total + value, 0) / values.length;
}

function byCase(runs: readonly CaseScore[]): CaseScore[][] {
  const grouped = new Map<string, CaseScore[]>();
  for (const scored of runs) {
    grouped.set(scored.run.id, [...(grouped.get(scored.run.id) ?? []), scored]);
  }
  return [...grouped.values()];
}

function subsetScore(subset: string, runs: readonly CaseScore[], names: Names): SubsetScore {
  const perCase = byCase(runs).map((ofCase) => sumCards(ofCase.map((scored) => cardScoreOf(scored, names))));
  const exact = runs.filter((scored) => {
    const { shown, right, expected } = cardScoreOf(scored, names);
    return shown === right && right === expected;
  });
  return {
    subset,
    cases: perCase.length,
    ...sumCards(perCase),
    meanPrecision: meanOf(perCase.flatMap(({ right, shown }) => (shown === 0 ? [] : [right / shown]))),
    meanRecall: meanOf(perCase.flatMap(({ right, expected }) => (expected === 0 ? [] : [right / expected]))),
    exact: { k: exact.length, n: runs.length },
  };
}

// Whether a search of the run carried a condition the case did not state.
function carriedUnstated({ turns }: CaseScore): boolean {
  const calls = (turns.at(-1)?.trace?.steps ?? []).flatMap(({ toolCalls }) => toolCalls);
  return calls
    .filter(({ name }) => name === 'searchRecruitingQuests')
    .some(({ input }) => {
      const args = (input ?? {}) as Record<string, unknown>;
      const { from, to } = args;
      const period =
        typeof from === 'string' &&
        typeof to === 'string' &&
        new Date(to).getTime() - new Date(from).getTime() < WEEK_MS;
      return period || CONDITION_ARGS.some((name) => args[name] !== undefined && args[name] !== null);
    });
}

function verdictOf({ k, n }: Measured, threshold: Threshold): Verdict {
  if (n === 0) {
    return { ...threshold, passed: null };
  }
  const value = k / n;
  const { comparator, value: wanted } = threshold;
  const passed = comparator === '>=' ? value >= wanted : comparator === '<=' ? value <= wanted : value === wanted;
  return { ...threshold, passed };
}

function counted(runs: readonly CaseScore[], test: (scored: CaseScore) => boolean): Measured {
  return { k: runs.filter((scored) => test(scored)).length, n: runs.length };
}

function recallOf(subsets: readonly SubsetScore[], wanted: readonly string[]): Measured {
  const chosen = subsets.filter(({ subset }) => wanted.includes(subset));
  return {
    k: chosen.reduce((total, { right }) => total + right, 0),
    n: chosen.reduce((total, { expected }) => total + expected, 0),
  };
}

const passedRun = (scored: CaseScore): boolean => scored.passed;

interface Reading {
  joins: readonly CaseScore[];
  runsTagged: (tag: string) => CaseScore[];
  names: Names;
}

// How evaluation C's metrics are measured.
function joinMeasures({ joins, runsTagged, names }: Reading): Record<string, () => Measured> {
  const tagPassed = (tag: string): Measured => counted(runsTagged(tag), (scored) => passedRun(scored));
  return {
    J1: () => counted(joins, (scored) => lastTurnOf(scored)?.score?.recalled === true),
    'J1-P': () =>
      counted(
        joins.filter((scored) => expectOfRun(scored)?.proposal !== undefined),
        (scored) => checkPassed(scored, 'proposal'),
      ),
    J2: () =>
      counted(
        joins.filter((scored) => expectedOf(scored).size > 0),
        (scored) => checkPassed(scored, 'cards'),
      ),
    J3a: () => tagPassed('J3a'),
    J3b: () => tagPassed('J3b'),
    J4: () =>
      counted(runsTagged('J4'), (scored) => {
        const expected = expectedOf(scored);
        return [...shownOf(scored, names)].some((card) => !expected.has(card));
      }),
    J6: () => tagPassed('J6'),
    J7: () => tagPassed('J7'),
    J8: () =>
      counted(
        joins.filter((scored) => expectOfRun(scored)?.text?.absent !== undefined),
        (scored) => !checkPassed(scored, 'text.absent'),
      ),
    J9: () => tagPassed('J9'),
    J10: () =>
      counted(runsTagged('J10'), (scored) => {
        const shown = shownOf(scored, names);
        return [...expectedOf(scored)].some((card) => !shown.has(card)) && carriedUnstated(scored);
      }),
    // A comparison of two runs: `pnpm eval:compare` over P19's baseline.
    G1: () => ({ k: 0, n: 0 }),
  };
}

// How evaluation D's metrics are measured.
function searchMeasures(
  subsets: readonly SubsetScore[],
  { runsTagged }: Reading,
  every: readonly CaseScore[],
): Record<string, () => Measured> {
  return {
    E1: () => {
      const { right, shown } = sumCards(subsets);
      return { k: right, n: shown };
    },
    E2: () => recallOf(subsets, ['L']),
    E3: () => recallOf(subsets, E3_SUBSETS),
    E4: () => recallOf(subsets, ['V']),
    E5: () => counted(runsTagged('E'), (scored) => passedRun(scored)),
    E7: () => recallOf(subsets, E7_SUBSETS),
    E8: () =>
      counted(every, ({ run }) => run.turns.some(({ failure }) => failure === 'STEP_LIMIT' || failure === 'TIMEOUT')),
  };
}

export function p5Report(score: RunScore, suite: Suite = p5Suite()): P5Report {
  const names = namesOf(score.saved.seeds);
  const reading: Reading = {
    names,
    joins: score.cases.filter(({ run }) => run.category === 'join-or-recruit'),
    runsTagged: (tag) => {
      const ids = new Set((suite.tags[tag] ?? []).map((written) => caseOfTag(written)));
      return score.cases.filter(({ run }) => ids.has(run.id));
    },
  };
  const subsets = CARD_SUBSETS.map((subset) => subsetScore(subset, reading.runsTagged(subset), names));
  const measures = { ...joinMeasures(reading), ...searchMeasures(subsets, reading, score.cases) };
  const metrics = Object.entries(measures).map(([metric, measure]): MetricScore => {
    const measured = measure();
    const verdicts = suite.thresholds
      .filter((threshold) => threshold.metric === metric)
      .map((threshold) => verdictOf(measured, threshold));
    return { metric, k: measured.k, n: measured.n, verdicts };
  });
  const cases = byCase(score.cases);
  return {
    metrics,
    subsets: subsets.filter(({ cases: held }) => held > 0),
    stable: { k: cases.filter((runs) => runs.every((scored) => passedRun(scored))).length, n: cases.length },
  };
}
