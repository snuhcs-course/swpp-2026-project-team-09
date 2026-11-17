/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { LETTERS, WEEKDAYS } from '../../src/timetable-reading/labels.ts';
import { checkedReading, type ReadTime, type TimetableReading } from '../../src/timetable-reading/reading-checks.ts';
import { placedAnswer, placedBlocks } from '../../src/timetable-reading/grid-mapping.ts';
import {
  answerSchema,
  gridTextSchema,
  type ModelAnswer,
  textSchema,
} from '../../src/timetable-reading/reading-model.ts';
import { blocksAnswer, fadingEnd } from '../../src/timetable-reading/second-look.ts';
import { gridOf } from './boxes.ts';
import { type ReadingScore, SCREENSHOTS, scoreReading, truthOf } from './score.ts';

// The saved answers of the experiment's runs (answers/<run>/<name>.<n>.json), read again with the checks as they are
// now: a whole answer as it came, and the first block run's text (b1) on the blocks saved with it.

export interface Saved {
  name: string;
  n: number;
  ms: number;
  inputTokens: number;
  outputTokens: number;
  answer: ModelAnswer;
}

const savedSchema = z.object({
  ms: z.number(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  boxes: z.array(z.object({ weekday: z.enum(WEEKDAYS), start: z.string(), end: z.string() })).optional(),
  answer: z.unknown(),
});

const gridRawSchema = z.object({
  mode: z.literal('grid'),
  mapped: z.literal(true),
  raw: z.object({
    layout: gridTextSchema,
    text: textSchema,
    reasked: z.record(z.string(), z.string().nullable()).optional(),
  }),
});

// A grid run's answer placed again from its raw layout and text with the code as it is now, so that a change of the
// placement rules (the fading end) is measured on the same model answers.
function answerOf(name: string, raw: z.infer<typeof savedSchema>, record: unknown): ModelAnswer {
  const grid = gridRawSchema.safeParse(record);
  if (grid.success) {
    const found = gridOf(name);
    const placed = placedBlocks(found, grid.data.raw.layout);
    const reasked = grid.data.raw.reasked ?? {};
    if (placed !== null) {
      const withEnds = placed.map((place, index) => {
        const { day, start, seen } = place;
        return String(index) in reasked ? { day, start, seen, modelEnd: reasked[String(index)] ?? null } : place;
      });
      return placedAnswer(found, withEnds, grid.data.raw.text);
    }
  }
  if (raw.boxes === undefined) {
    return answerSchema.parse(raw.answer);
  }
  const blocks = raw.boxes.map(({ weekday, start, end }) => ({ day: LETTERS[weekday], start, end }));
  return blocksAnswer(blocks, textSchema.parse(raw.answer));
}

export function savedAnswers(run: string, reads = 3, names: readonly string[] = SCREENSHOTS): Saved[] {
  return names.flatMap((name) =>
    Array.from({ length: reads }, (_, index) => index + 1).flatMap((n) => {
      const file = new URL(`answers/${run}/${name}.${n}.json`, import.meta.url);
      if (!existsSync(file)) {
        return [];
      }
      const record: unknown = JSON.parse(readFileSync(file, 'utf8'));
      const raw = savedSchema.parse(record);
      return [
        {
          name,
          n,
          ms: raw.ms,
          inputTokens: raw.inputTokens,
          outputTokens: raw.outputTokens,
          answer: answerOf(name, raw, record),
        },
      ];
    }),
  );
}

export function scored(saved: Saved): ReadingScore {
  return scoreReading(checkedReading(saved.answer), truthOf(saved.name));
}

const sameTime = (one: ReadTime, other: ReadTime): boolean =>
  one.weekday === other.weekday && one.start === other.start && one.end === other.end && one.room === other.room;

// Two readings of one picture kept where they agree: a time stays when the other reading has the same class name with
// the same day, start, end and room; every other time is left out. A way to turn a rare misreading into a time left
// out, at twice the cost.
export function agreed(one: TimetableReading, other: TimetableReading): TimetableReading {
  if (one.kind === 'none' || other.kind === 'none') {
    return { kind: 'none' };
  }
  const leftOut = [...one.leftOut];
  const classes = one.classes
    .map((lesson) => {
      const twin = other.classes.find(({ name }) => name === lesson.name);
      const times = lesson.times.filter((time) => twin?.times.some((otherTime) => sameTime(time, otherTime)) === true);
      for (const time of lesson.times.filter((kept) => !times.includes(kept))) {
        leftOut.push({ weekday: time.weekday, name: lesson.name, start: time.start, end: time.end, reason: 'cut' });
      }
      return { name: lesson.name, times };
    })
    .filter(({ times }) => times.length > 0);
  return { kind: 'read', title: one.title === other.title ? one.title : null, classes, leftOut };
}

// P15-52, the fading block: each rule for a block whose end is not seen, judged on every fading block of a grid run's
// readings (from the raw answers it saved) against the ground truth: right, wrong, or left out.
export type FadeRule =
  'window' | 'usual-end' | 'model-agrees-with-pixels' | 'two-readings-agree' | 'agrees-or-reask-agrees';

export interface FadeCase {
  name: string;
  n: number;
  truthEnd: string | null;
  seen: string;
  modelEnd: string | null;
  // The end a second call on that block alone read, when it was asked.
  reaskedEnd?: string | null;
}

const rawRecordSchema = z.object({
  raw: z.object({ layout: gridTextSchema, reasked: z.record(z.string(), z.string().nullable()).optional() }),
  mode: z.literal('grid'),
});

export function fadeCases(run: string, names: readonly string[]): FadeCase[] {
  return names.flatMap((name) => {
    const grid = gridOf(name);
    const reads = Array.from({ length: 12 }, (_, index) => index + 1);
    const truth = truthOf(name);
    return reads.flatMap((n) => {
      const file = new URL(`answers/${run}/${name}.${n}.json`, import.meta.url);
      if (!existsSync(file)) {
        return [];
      }
      const parsed = rawRecordSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
      const placed = parsed.success ? placedBlocks(grid, parsed.data.raw.layout) : null;
      return grid.blocks.flatMap((block, index) => {
        const place = placed?.[index];
        if (block.fades !== true || place === undefined) {
          return [];
        }
        const weekday = WEEKDAYS.find((day) => LETTERS[day] === place.day);
        const truthEnd =
          truth.times.find((time) => time.weekday === weekday && time.start === place.start)?.end ?? null;
        const reasked = parsed.success ? parsed.data.raw.reasked : undefined;
        const reaskedEnd =
          reasked === undefined || !(String(index) in reasked) ? undefined : (reasked[String(index)] ?? null);
        return [{ name, n, truthEnd, seen: place.seen, modelEnd: place.modelEnd, reaskedEnd }];
      });
    });
  });
}

const minutesOfClock = (text: string): number => {
  const [hours = 0, minutes = 0] = text.split(':').map(Number);
  return hours * 60 + minutes;
};

export function fadeRuleEnd(rule: FadeRule, one: FadeCase, other: FadeCase | undefined): string | null {
  const windowed = fadingEnd(one.seen, one.modelEnd);
  if (rule === 'window') {
    return windowed;
  }
  if (rule === 'usual-end') {
    return [0, 15, 45, 50].includes(minutesOfClock(one.seen) % 60) ? one.seen : null;
  }
  if (rule === 'agrees-or-reask-agrees') {
    const agrees = (end: string | null | undefined): boolean =>
      end !== null && end !== undefined && Math.abs(minutesOfClock(end) - minutesOfClock(one.seen)) <= 5;
    return agrees(one.modelEnd) || agrees(one.reaskedEnd) ? one.seen : null;
  }
  if (rule === 'model-agrees-with-pixels') {
    const agrees = one.modelEnd !== null && Math.abs(minutesOfClock(one.modelEnd) - minutesOfClock(one.seen)) <= 5;
    return agrees ? one.seen : null;
  }
  const otherEnd = other === undefined ? null : fadingEnd(other.seen, other.modelEnd);
  return windowed !== null && otherEnd === windowed ? windowed : null;
}
