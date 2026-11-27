/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import type { PlacePoint, ReplyStep } from './answer.dto.js';

// The steps on screen as an app that says `answers` sends them back (`RequestContext.steps`, P05 ticket 74): each in the
// shape the reply gave it.

// Answers and bookings of one conversation: the reply gives no more, nor longer words, than this takes back.
export const STEPS_MAX = 32;
export const TITLE_MAX = 200;
const KEY_MAX = 200;
export const REASON_MAX = 500;

const placePointSchema = z.strictObject({
  placeId: z.uuid(),
  label: z.string().min(1).max(TITLE_MAX),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}) satisfies z.ZodType<PlacePoint>;

const replyStepSchema = z.strictObject({
  kind: z.enum(['seat', 'room', 'meal', 'meet', 'events', 'quests', 'new-quest', 'study']),
  title: z.string().min(1).max(TITLE_MAX),
  place: placePointSchema.nullable(),
  from: placePointSchema.nullable(),
  startAt: z.iso.datetime({ offset: true }).nullable(),
  endAt: z.iso.datetime({ offset: true }).nullable(),
  status: z.enum(['shown', 'not-done']),
  reason: z.string().max(REASON_MAX).nullable(),
  shows: z
    .discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('card'), key: z.string().min(1).max(KEY_MAX) }),
      z.strictObject({ kind: z.literal('answer'), key: z.string().min(1).max(KEY_MAX).optional() }),
    ])
    .nullable(),
}) satisfies z.ZodType<ReplyStep>;

export const replyStepsSchema = z.array(replyStepSchema).max(STEPS_MAX);

const cut = (text: string, max: number): string => (text.length <= max ? text : text.slice(0, max));

const pointFitted = (point: PlacePoint | null): PlacePoint | null =>
  point === null ? null : { ...point, label: cut(point.label, TITLE_MAX) };

// A step in words no longer than the app may send back (`context.steps`): an event's title is a collected post's own.
export const fittedStep = (step: ReplyStep): ReplyStep => ({
  ...step,
  title: cut(step.title, TITLE_MAX),
  place: pointFitted(step.place),
  from: pointFitted(step.from),
  reason: step.reason === null ? null : cut(step.reason, REASON_MAX),
});
