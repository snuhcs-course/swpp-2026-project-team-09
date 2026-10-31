/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';

// The model's answer. A time's format is not in the schema, since providers differ in the patterns they take: a time
// the checks cannot read fails them.
const answeredSessionSchema = z.strictObject({
  start: z.string().nullable(),
  end: z.string().nullable(),
  place: z.string().nullable(),
  overPeriod: z.boolean(),
  lines: z.strictObject({
    start: z.array(z.string()),
    end: z.array(z.string()),
    place: z.array(z.string()),
  }),
});

export const judgementAnswerSchema = z.strictObject({
  announcesEvent: z.boolean(),
  sessions: z.array(answeredSessionSchema),
});

export type AnsweredSession = z.infer<typeof answeredSessionSchema>;

export type JudgementAnswer = z.infer<typeof judgementAnswerSchema>;

// What the server checks, each on its own, for each session.
export const JUDGEMENT_CHECKS = [
  'announcesEvent',
  'linesInPost',
  'dateAgrees',
  'weekdayAgrees',
  'timeAgrees',
  'notApplicationPeriod',
  'startBeforeEnd',
  'hasTimeOfDay',
  'length',
  'placeInLines',
  'placeMatches',
  'newSession',
] as const;

export type JudgementCheck = (typeof JUDGEMENT_CHECKS)[number];

// A session of a stored Judgement. `globalEventId` is the event it was published as or attached to, or its Draft while it
// waits for an Administrator, and empty until then.
const judgedSessionSchema = answeredSessionSchema.extend({
  placeId: z.string().nullable(),
  checks: z.array(z.strictObject({ name: z.enum(JUDGEMENT_CHECKS), passed: z.boolean() })),
  passed: z.boolean(),
  globalEventId: z.string().nullable(),
});

export type JudgedSession = z.infer<typeof judgedSessionSchema>;

// What a Judgement's `sessions` column holds, empty when no answer came.
export function storedSessions(stored: unknown): JudgedSession[] {
  return stored === null ? [] : z.array(judgedSessionSchema).parse(stored);
}
