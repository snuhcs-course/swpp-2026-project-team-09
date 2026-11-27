/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import type { PlacePoint, ReplyStep } from './answer.dto.js';

// The steps on screen as an app that says `answers` sends them back (`RequestContext.steps`, P05 ticket 74): each in the
// shape the reply gave it.

// Answers and bookings of one conversation.
const STEPS_MAX = 16;
const TITLE_MAX = 200;
const KEY_MAX = 200;
const REASON_MAX = 500;

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
