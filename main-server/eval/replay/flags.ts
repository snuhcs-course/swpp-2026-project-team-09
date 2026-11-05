/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { parseArgs } from 'node:util';
import { z } from 'zod';
import { GOLD_FILE } from './gold.ts';

// The command lines of the replay's three commands. A date is a day in Korea and stands for its first moment.

const DAY_MS = 24 * 60 * 60 * 1000;

const daySchema = z.iso.date();

export function koreaDay(text: string, flag: string): Date {
  const parsed = daySchema.safeParse(text);
  if (!parsed.success) {
    throw new Error(`--${flag} takes a day as YYYY-MM-DD, not ${text}`);
  }
  return new Date(`${parsed.data}T00:00:00+09:00`);
}

function required(value: string | undefined, flag: string): string {
  if (value === undefined) {
    throw new Error(`--${flag} is required`);
  }
  return value;
}

function ordered(from: Date, to: Date): void {
  if (to.getTime() < from.getTime()) {
    throw new Error('--to comes before --from');
  }
}

export interface ReplayFlags {
  gold: string | URL;
  // Only events before it teach stage C.
  asOf: Date;
  development: boolean;
  // The rules files of stage E, from `pnpm eval:induce`.
  rules: string[];
}

// `--as-of` left out is the moment the command runs, so that stage C learns from every event so far.
export function replayFlags(argv: string[], now: Date): ReplayFlags {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      gold: { type: 'string' },
      'as-of': { type: 'string' },
      development: { type: 'boolean', default: false },
      rules: { type: 'string', multiple: true, default: [] },
    },
  });
  return {
    gold: values.gold ?? GOLD_FILE,
    asOf: values['as-of'] === undefined ? now : koreaDay(values['as-of'], 'as-of'),
    development: values.development,
    rules: values.rules,
  };
}

// `--final-from <day>`: the rows from that day are the final slice, which no tuning of k, s or the templates' thresholds
// reads, and whose numbers alone are reported once the tuning is done (research note 10 §3). Null when left out.
function finalFromOf(value: string | undefined): Date | null {
  return value === undefined ? null : koreaDay(value, 'final-from');
}

export interface CurveFlags {
  // The first and the last point.
  from: Date;
  to: Date;
  stepDays: number;
  finalFrom: Date | null;
  // The rules files of the induced series, each point using the newest induced before it.
  rules: string[];
}

export function curveFlags(argv: string[]): CurveFlags {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      from: { type: 'string' },
      to: { type: 'string' },
      step: { type: 'string', default: '7' },
      'final-from': { type: 'string' },
      rules: { type: 'string', multiple: true, default: [] },
    },
  });
  const from = koreaDay(required(values.from, 'from'), 'from');
  const to = koreaDay(required(values.to, 'to'), 'to');
  ordered(from, to);
  const stepDays = Number(values.step);
  if (!Number.isInteger(stepDays) || stepDays < 1) {
    throw new Error(`--step takes a whole number of days, not ${values.step}`);
  }
  return { from, to, stepDays, finalFrom: finalFromOf(values['final-from']), rules: values.rules };
}

export interface InduceFlags {
  // Only rows before it are learned from.
  asOf: Date;
  // Whether the gold development set's items join the instances, and which fold of them is held out.
  development: boolean;
  fold: { index: number; count: number } | null;
  budget: number;
  seed: number;
}

function foldOf(value: string | undefined): InduceFlags['fold'] {
  if (value === undefined) {
    return null;
  }
  const match = /^(\d+)\/(\d+)$/u.exec(value);
  const index = Number(match?.[1]);
  const count = Number(match?.[2]);
  if (match === null || count < 2 || index < 1 || index > count) {
    throw new Error(`--fold takes i/k with 1 ≤ i ≤ k and k ≥ 2, not ${value}`);
  }
  return { index: index - 1, count };
}

function wholeNumber(value: string, flag: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`--${flag} takes a whole number, not ${value}`);
  }
  return number;
}

// `pnpm eval:induce [--as-of <day>] [--development [--fold i/k]] [--budget 12] [--seed 1]`.
export function induceFlags(argv: string[], now: Date): InduceFlags {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      'as-of': { type: 'string' },
      development: { type: 'boolean', default: false },
      fold: { type: 'string' },
      budget: { type: 'string', default: '12' },
      seed: { type: 'string', default: '1' },
    },
  });
  if (values.fold !== undefined && !values.development) {
    throw new Error('--fold needs --development');
  }
  return {
    asOf: values['as-of'] === undefined ? now : koreaDay(values['as-of'], 'as-of'),
    development: values.development,
    fold: foldOf(values.fold),
    budget: wholeNumber(values.budget, 'budget'),
    seed: wholeNumber(values.seed, 'seed'),
  };
}

export interface SuggestionFlags {
  from: Date;
  // The end of the last day, exclusive.
  until: Date;
  finalFrom: Date | null;
}

export function suggestionFlags(argv: string[]): SuggestionFlags {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: { from: { type: 'string' }, to: { type: 'string' }, 'final-from': { type: 'string' } },
  });
  const from = koreaDay(required(values.from, 'from'), 'from');
  const to = koreaDay(required(values.to, 'to'), 'to');
  ordered(from, to);
  return { from, until: new Date(to.getTime() + DAY_MS), finalFrom: finalFromOf(values['final-from']) };
}
