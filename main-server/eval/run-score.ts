/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { addTokens, costOf, NO_TOKENS, pricesSchema, type Tokens } from './cost.ts';
import { KINDS, type Kind, kindsOf } from './expect.ts';
import { namesOf } from './normalise.ts';
import type { CaseRun } from './runner.ts';
import { type CaseScore, type Check, scoreCase, type TurnScore } from './score.ts';
import { type FailureKind, usageOf } from './trace.ts';

// A run scored (spec P19, "The scorecard"): its cases by the scorer's rules (eval/score.ts), summed into the
// scorecard's numbers. It reads the raw JSON the runner saved, so a saved run is scored again without the model.

const savedRunSchema = z.looseObject({
  name: z.string().default('run'),
  options: z.looseObject({ prices: pricesSchema.optional() }).default({}),
  // The world's seeds, by which ids are read as seed names.
  seeds: z.record(z.string(), z.looseObject({ id: z.string() })).default({}),
  stoppedBy: z.string().nullable().default(null),
  // As the runner saved them.
  cases: z.array(z.custom<CaseRun>((value) => typeof value === 'object' && value !== null && 'turns' in value)),
});

export type SavedRun = z.output<typeof savedRunSchema>;

export interface CategoryScore {
  // The case runs without a known failure, and those that passed.
  runs: number;
  passed: number;
  // The case runs of known failures, and those that passed.
  knownRuns: number;
  knownPassed: number;
  // The scored turns that failed this way.
  failures: Record<FailureKind, number>;
}

export interface RunScore {
  saved: SavedRun;
  cases: CaseScore[];
  // Per kind, in the order of KINDS.
  recall: { kind: Kind; expected: number; recalled: number }[];
  // Turns that called every required tool and no forbidden one.
  toolSelection: { turns: number; correct: number };
  args: { expected: number; matched: number };
  overCalling: { turns: number; withOver: number; calls: number };
  underCalling: { turns: number; withUnder: number; calls: number };
  categories: Record<string, CategoryScore>;
  // Per set of accepted actions, in the order first met, how many turns took each observed action.
  confusion: { expected: string; observed: Record<string, number> }[];
  // Cases marked as known failures of which every run passed: their mark is to be removed.
  knownNowPassing: string[];
  // The cases run more than once, and how many of their runs passed; a case counts toward pass^k when all did.
  passK: { k: number; cases: { id: string; runs: number; passed: number }[]; passedAll: number };
  // Every turn sent, scored or not.
  usage: { turns: number; steps: number; latencyMs: number; tokens: Tokens; costUsd: number | null };
}

function countOf<T>(items: readonly T[], test: (item: T) => boolean): number {
  return items.filter((item) => test(item)).length;
}

function sumOf<T>(items: readonly T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

// A turn counts toward the kinds of the action it took when the case accepts it, else toward those of the first action
// the case accepts, and is recalled when the action is accepted and, when it asks, the text holds the mentions.
function recallOf(turns: readonly TurnScore[]): RunScore['recall'] {
  return KINDS.map((kind) => {
    const counted = turns.filter(({ action, accepted }) => {
      const gold = action !== null && accepted.includes(action) ? action : accepted[0];
      return gold !== undefined && kindsOf(gold).includes(kind);
    });
    return { kind, expected: counted.length, recalled: countOf(counted, ({ recalled }) => recalled) };
  });
}

function confusionOf(turns: readonly TurnScore[]): RunScore['confusion'] {
  const rows: RunScore['confusion'] = [];
  for (const { accepted, observed } of turns) {
    const expected = accepted.join(' or ');
    let row = rows.find((found) => found.expected === expected);
    if (row === undefined) {
      row = { expected, observed: {} };
      rows.push(row);
    }
    row.observed[observed] = (row.observed[observed] ?? 0) + 1;
  }
  return rows;
}

function categoriesOf(cases: readonly CaseScore[]): Record<string, CategoryScore> {
  const categories: Record<string, CategoryScore> = {};
  for (const { run, passed } of cases) {
    const category = (categories[run.category] ??= {
      runs: 0,
      passed: 0,
      knownRuns: 0,
      knownPassed: 0,
      failures: { STEP_LIMIT: 0, TIMEOUT: 0, ERROR: 0 },
    });
    if (run.knownFailure === null) {
      category.runs += 1;
      category.passed += passed ? 1 : 0;
    } else {
      category.knownRuns += 1;
      category.knownPassed += passed ? 1 : 0;
    }
    // Every turn that ran, scored or not.
    for (const { failure } of run.turns) {
      if (failure !== null) {
        category.failures[failure] += 1;
      }
    }
  }
  return categories;
}

// The runs of each case, in the order first run.
export function runsById(cases: readonly CaseScore[]): Map<string, CaseScore[]> {
  const byId = new Map<string, CaseScore[]>();
  for (const scored of cases) {
    byId.set(scored.run.id, [...(byId.get(scored.run.id) ?? []), scored]);
  }
  return byId;
}

function passKOf(cases: readonly CaseScore[]): RunScore['passK'] {
  const repeated = [...runsById(cases)]
    .filter(([, runs]) => runs.length > 1)
    .map(([id, runs]) => ({ id, runs: runs.length, passed: countOf(runs, ({ passed }) => passed) }));
  return {
    k: Math.max(0, ...repeated.map(({ runs }) => runs)),
    cases: repeated,
    passedAll: countOf(repeated, ({ runs, passed }) => runs === passed),
  };
}

function usageOfRun(saved: SavedRun): RunScore['usage'] {
  const sent = saved.cases.flatMap((run) => run.turns);
  const tokens = sent.reduce<Tokens>((total, trace) => addTokens(total, usageOf(trace.steps)), NO_TOKENS);
  const { prices } = saved.options;
  return {
    turns: sent.length,
    steps: sumOf(sent, (trace) => trace.steps.length),
    latencyMs: sumOf(sent, (trace) => trace.latencyMs),
    tokens,
    costUsd: prices === undefined ? null : costOf(tokens, prices),
  };
}

function toolsOf(
  turns: readonly TurnScore[],
): Pick<RunScore, 'toolSelection' | 'args' | 'overCalling' | 'underCalling'> {
  const toolChecks = new Set<Check['name']>(['tools.required', 'tools.forbidden']);
  return {
    toolSelection: {
      turns: turns.length,
      correct: countOf(turns, ({ checks }) => checks.every(({ name, passed }) => passed || !toolChecks.has(name))),
    },
    args: { expected: sumOf(turns, ({ args }) => args.expected), matched: sumOf(turns, ({ args }) => args.matched) },
    overCalling: {
      turns: turns.length,
      withOver: countOf(turns, ({ overCalls }) => overCalls.length > 0),
      calls: sumOf(turns, ({ overCalls }) => overCalls.length),
    },
    underCalling: {
      turns: turns.length,
      withUnder: countOf(turns, ({ underCalls }) => underCalls.length > 0),
      calls: sumOf(turns, ({ underCalls }) => underCalls.length),
    },
  };
}

// A run as the runner saved it, scored.
export function scoreRun(written: unknown): RunScore {
  const saved = savedRunSchema.parse(written);
  const names = namesOf(saved.seeds);
  const cases = saved.cases.map((run) => scoreCase(run, names));
  const turns = cases.flatMap(({ turns: scored }) => scored.flatMap(({ score }) => (score === null ? [] : [score])));
  const knownNowPassing = [...runsById(cases)]
    .filter(([, runs]) => runs.every(({ run, passed }) => run.knownFailure !== null && passed))
    .map(([id]) => id);
  return {
    saved,
    cases,
    recall: recallOf(turns),
    ...toolsOf(turns),
    categories: categoriesOf(cases),
    confusion: confusionOf(turns),
    knownNowPassing,
    passK: passKOf(cases),
    usage: usageOfRun(saved),
  };
}

// Each case by id, passing only when every run of it passed.
export function passedById(score: RunScore): Map<string, { passed: boolean; knownFailure: string | null }> {
  return new Map(
    [...runsById(score.cases)].map(([id, runs]) => [
      id,
      { passed: runs.every(({ passed }) => passed), knownFailure: runs[0]?.run.knownFailure ?? null },
    ]),
  );
}

export function totalFailures(score: RunScore, kind: FailureKind): number {
  return Object.values(score.categories).reduce((total, { failures }) => total + failures[kind], 0);
}

// The categories summed.
export function allCategories(score: RunScore): Omit<CategoryScore, 'failures'> {
  return Object.values(score.categories).reduce(
    (total, category) => ({
      runs: total.runs + category.runs,
      passed: total.passed + category.passed,
      knownRuns: total.knownRuns + category.knownRuns,
      knownPassed: total.knownPassed + category.knownPassed,
    }),
    { runs: 0, passed: 0, knownRuns: 0, knownPassed: 0 },
  );
}

// Steps and seconds per turn sent, or null when none was.
export function averagesOf(score: RunScore): { steps: number | null; latencySeconds: number | null } {
  const { turns, steps, latencyMs } = score.usage;
  return turns === 0
    ? { steps: null, latencySeconds: null }
    : { steps: steps / turns, latencySeconds: latencyMs / turns / 1000 };
}

function shownSetting(value: unknown): string {
  if (value === null || value === undefined) {
    return 'default';
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? 'all' : value.join(', ');
  }
  return typeof value === 'string' ? value : JSON.stringify(value);
}

// The run's options but its prices, each as text.
export function settingsOf(score: RunScore): [string, string][] {
  return Object.entries(score.saved.options)
    .filter(([name]) => name !== 'prices')
    .map(([name, value]) => [name, shownSetting(value)]);
}
