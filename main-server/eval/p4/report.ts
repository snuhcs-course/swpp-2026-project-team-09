/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { type Expect, expectSchema } from '../expect.ts';
import { type Names, namesOf } from '../normalise.ts';
import { allCategories, type RunScore } from '../run-score.ts';
import { type CaseScore, type Check, scoreTurn } from '../score.ts';
import { type TurnTrace } from '../trace.ts';
import { p4Holdout } from './holdout.ts';

// The P4 suite's numbers (P04 ticket 06): each threshold's pass or fail, and where runs failed, layer by layer from the
// action to the reply's words. It reads only the scorer's output, so a stored run is read without the model. Nothing
// here but the thresholds decides anything: they stay as frozen in suite.yaml.

const suiteSchema = z.looseObject({
  cases: z.record(z.string(), z.int()),
  score: z.looseObject({ overall: z.number(), perCategory: z.number(), runs: z.int() }),
});

export type P4Suite = z.output<typeof suiteSchema>;

export function p4Suite(): P4Suite {
  return suiteSchema.parse(parse(readFileSync(new URL('suite.yaml', import.meta.url), 'utf8')));
}

export interface Measured {
  k: number;
  n: number;
}

export interface RateScore extends Measured {
  name: string;
  wanted: number;
  // Null when the run is not of the whole suite.
  passed: boolean | null;
}

export interface LayerScore extends Measured {
  layer: string;
}

export interface P4Report {
  // Overall, then per category.
  rates: RateScore[];
  layers: LayerScore[];
  wordsAlone: { id: string; repetition: number }[];
  // The runs of the cases the holdout rewords, for its record to set beside the holdout's rate.
  reworded: Measured;
}

const WORDS = 'Words';

interface Layer {
  layer: string;
  checks: readonly Check['name'][];
  // Whether a case's expectation checks this layer: the scorer's tool and argument checks always pass when it does not.
  checkedBy: (expect: Expect) => boolean;
}

const LAYERS: readonly Layer[] = [
  { layer: 'Action', checks: ['action'], checkedBy: () => true },
  {
    layer: 'Tools',
    checks: ['tools.required', 'tools.forbidden'],
    checkedBy: ({ tools }) => tools.required.length > 0 || tools.forbidden.length > 0,
  },
  { layer: 'Arguments', checks: ['args'], checkedBy: ({ args }) => Object.keys(args).length > 0 },
  {
    layer: 'Cards and map buttons',
    checks: ['cards', 'mapButtons'],
    checkedBy: ({ cards, mapButtons }) => cards !== undefined || mapButtons !== undefined,
  },
  { layer: 'Proposal', checks: ['proposal'], checkedBy: ({ proposal }) => proposal !== undefined },
  { layer: WORDS, checks: ['text.mentions', 'text.absent'], checkedBy: ({ text }) => text !== undefined },
];

function spaceless(text: string): string {
  return text.replaceAll(/\s/gu, '');
}

// The reply as if its words were right: without the words it must not hold, and with one word of each mention.
function withRightWords(trace: TurnTrace, { text }: Expect): TurnTrace {
  if (trace.reply === null || text === undefined) {
    return trace;
  }
  const kept = (text.absent ?? []).reduce(
    (written, word) => written.replaceAll(spaceless(word), ''),
    spaceless(trace.reply.text),
  );
  const mentioned = (text.mentions ?? []).map((mention) => (typeof mention === 'string' ? mention : mention[0]));
  return { ...trace, reply: { ...trace.reply, text: [kept, ...mentioned].join(' ') } };
}

interface RunLayers {
  id: string;
  repetition: number;
  // The layers its case checks, and of those the ones it failed.
  checked: string[];
  failed: string[];
}

// A run's layers. The scorer's action check also reads the words: an ASK without its mentions, or a lookup that found
// nothing and a reply that does not say so, fails it. So the action is read as if the words were right, and such a run
// fails in the words alone, which is where it would need fixing. An ASK is only ever read from its words, so a reply
// that does not ask at all counts there too, unless it did something else instead.
function layersOf({ run, turns }: CaseScore, names: Names): RunLayers | null {
  const last = turns.at(-1);
  const written = run.turnExpects.at(-1) ?? run.expect;
  if (last?.trace === null || last?.trace === undefined || last.score === null || written === null) {
    return null;
  }
  const expect = expectSchema.parse(written);
  const { checks } = last.score;
  const actionRight = scoreTurn(withRightWords(last.trace, expect), expect, names).checks.some(
    ({ name, passed }) => name === 'action' && passed,
  );
  const failedChecks = new Set(
    checks.filter(({ name, passed }) => !passed && name !== 'action').map(({ name }) => name),
  );
  const held = LAYERS.filter(({ checkedBy }) => checkedBy(expect));
  const failed = held.filter(({ layer, checks: read }) =>
    layer === 'Action' ? !actionRight : read.some((name) => failedChecks.has(name)),
  );
  return {
    id: run.id,
    repetition: run.repetition,
    checked: held.map(({ layer }) => layer),
    failed: failed.map(({ layer }) => layer),
  };
}

function rateOf(name: string, wanted: number, { k, n }: Measured, whole: boolean): RateScore {
  return { name, k, n, wanted, passed: whole ? k / n >= wanted : null };
}

function ratesOf(score: RunScore, { cases, score: wanted }: P4Suite): RateScore[] {
  const ofCategory = (name: string): Measured => {
    const category = score.categories[name];
    return { k: category?.passed ?? 0, n: category?.runs ?? 0 };
  };
  const isWhole = (name: string): boolean => ofCategory(name).n === (cases[name] ?? 0) * wanted.runs;
  const names = Object.keys(cases);
  const { passed, runs } = allCategories(score);
  return [
    rateOf(
      'Overall',
      wanted.overall,
      { k: passed, n: runs },
      names.every((name) => isWhole(name)),
    ),
    ...names.map((name) => rateOf(name, wanted.perCategory, ofCategory(name), isWhole(name))),
  ];
}

export function p4Report(score: RunScore, suite: P4Suite = p4Suite()): P4Report {
  const names = namesOf(score.saved.seeds);
  const runs = score.cases.flatMap((scored) => layersOf(scored, names) ?? []);
  const rewordedIds = new Set(p4Holdout().wordings.map(({ of }) => of));
  const reworded = score.cases.filter(({ run }) => rewordedIds.has(run.id));
  return {
    rates: ratesOf(score, suite),
    layers: LAYERS.map(({ layer }) => {
      const checked = runs.filter((run) => run.checked.includes(layer));
      return { layer, k: checked.filter(({ failed }) => !failed.includes(layer)).length, n: checked.length };
    }),
    wordsAlone: runs
      .filter(({ failed }) => failed.length === 1 && failed[0] === WORDS)
      .map(({ id, repetition }) => ({ id, repetition })),
    reworded: { k: reworded.filter(({ passed }) => passed).length, n: reworded.length },
  };
}
