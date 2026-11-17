/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { LETTERS, WEEKDAYS } from '../../src/timetable-reading/labels.ts';
import { checkedReading, type ReadTime, type TimetableReading } from '../../src/timetable-reading/reading-checks.ts';
import { answerSchema, type ModelAnswer, textSchema } from '../../src/timetable-reading/reading-model.ts';
import { blocksAnswer } from '../../src/timetable-reading/second-look.ts';
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

function answerOf(raw: z.infer<typeof savedSchema>): ModelAnswer {
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
      const raw = savedSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
      return [
        { name, n, ms: raw.ms, inputTokens: raw.inputTokens, outputTokens: raw.outputTokens, answer: answerOf(raw) },
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
