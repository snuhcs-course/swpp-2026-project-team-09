/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
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
    },
  });
  return {
    gold: values.gold ?? GOLD_FILE,
    asOf: values['as-of'] === undefined ? now : koreaDay(values['as-of'], 'as-of'),
    development: values.development,
  };
}

export interface CurveFlags {
  // The first and the last point.
  from: Date;
  to: Date;
  stepDays: number;
}

export function curveFlags(argv: string[]): CurveFlags {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: { from: { type: 'string' }, to: { type: 'string' }, step: { type: 'string', default: '7' } },
  });
  const from = koreaDay(required(values.from, 'from'), 'from');
  const to = koreaDay(required(values.to, 'to'), 'to');
  ordered(from, to);
  const stepDays = Number(values.step);
  if (!Number.isInteger(stepDays) || stepDays < 1) {
    throw new Error(`--step takes a whole number of days, not ${values.step}`);
  }
  return { from, to, stepDays };
}

export interface SuggestionFlags {
  from: Date;
  // The end of the last day, exclusive.
  until: Date;
}

export function suggestionFlags(argv: string[]): SuggestionFlags {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: { from: { type: 'string' }, to: { type: 'string' } },
  });
  const from = koreaDay(required(values.from, 'from'), 'from');
  const to = koreaDay(required(values.to, 'to'), 'to');
  ordered(from, to);
  return { from, until: new Date(to.getTime() + DAY_MS) };
}
