/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { POST_SOURCE_NAMES } from '../post-sources.js';

// A time with its offset, or a day when the rules read no time of day, which stands for its start in Asia/Seoul.
const boundSchema = z
  .union([
    z.iso.datetime({ offset: true }).transform((time) => ({ at: new Date(time), hasTimeOfDay: true })),
    z.iso.date().transform((day) => ({ at: new Date(`${day}T00:00:00+09:00`), hasTimeOfDay: false })),
  ])
  .nullable();

const collectedSessionSchema = z.strictObject({
  number: z.int32().positive(),
  start: boundSchema,
  end: boundSchema,
  // Where the start and end were read: the body's time line, or the header's date.
  readFrom: z.enum(['body', 'header']).nullable(),
  place: z.string().min(1).nullable(),
});

const collectedPostSchema = z.strictObject({
  // What identifies the post on its Source: SNU Now's `bbsidx`, extra.snu's `dataSeq`.
  key: z.string().min(1),
  // Shown as a link, so no other scheme is taken.
  address: z.url({ protocol: /^https$/u }),
  title: z.string().min(1),
  description: z.string(),
  sessions: z
    .array(collectedSessionSchema)
    .min(1)
    .refine(
      (sessions) => new Set(sessions.map(({ number }) => number)).size === sessions.length,
      'Each session must appear once',
    ),
});

// What one Collection of a Source's posts read, posted by the worker to `/global-events/collected`: the posts the main
// server did not store when the worker asked.
export const eventsCollectedSchema = z.strictObject({
  source: z.enum(POST_SOURCE_NAMES),
  collectedAt: z.iso.datetime({ offset: true }),
  // Why the Collection stopped early, or null when it went through the whole list. Its posts are stored all the same,
  // and the reason is recorded as its failure.
  failureReason: z.string().min(1).nullable(),
  posts: z
    .array(collectedPostSchema)
    .refine((posts) => new Set(posts.map(({ key }) => key)).size === posts.length, 'Each post must appear once'),
});

export type EventsCollectedMessage = z.infer<typeof eventsCollectedSchema>;

export type CollectedPost = EventsCollectedMessage['posts'][number];

export type CollectedSession = CollectedPost['sessions'][number];
