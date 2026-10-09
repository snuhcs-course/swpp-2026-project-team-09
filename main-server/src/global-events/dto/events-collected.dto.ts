// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #30
import { z } from 'zod';
import { Source } from '../../generated/prisma/client.js';

// A time with its offset, or a day when the rules read no time of day, which stands for its start in Asia/Seoul.
const boundSchema = z
  .union([
    z.iso.datetime({ offset: true }).transform((time) => ({ at: new Date(time), hasTimeOfDay: true })),
    z.iso.date().transform((day) => ({ at: new Date(`${day}T00:00:00+09:00`), hasTimeOfDay: false })),
  ])
  .nullable();

const collectedEventSchema = z.strictObject({
  // The post's `bbsidx`. The column's range, so that a larger number is refused here rather than in the database.
  postNumber: z.int32().positive(),
  // Shown as a link, so no other scheme is taken.
  sourceUrl: z.url({ protocol: /^https$/u }),
  title: z.string().min(1),
  description: z.string(),
  start: boundSchema,
  end: boundSchema,
  // Where the start and end were read: the body's time line, or the header's date.
  readFrom: z.enum(['body', 'header']).nullable(),
  place: z.string().min(1).nullable(),
});

// What one Collection of the events list read, posted by the worker to `/global-events/collected`: the posts the main
// server did not store when the worker asked.
export const eventsCollectedSchema = z.strictObject({
  source: z.enum([Source.snu_events]),
  collectedAt: z.iso.datetime({ offset: true }),
  // Why the Collection stopped early, or null when it went through the whole list. Its posts are stored all the same,
  // and the reason is recorded as its failure.
  failureReason: z.string().min(1).nullable(),
  events: z
    .array(collectedEventSchema)
    .refine(
      (events) => new Set(events.map(({ postNumber }) => postNumber)).size === events.length,
      'Each post must appear once',
    ),
});

export type EventsCollectedMessage = z.infer<typeof eventsCollectedSchema>;

export type CollectedEvent = EventsCollectedMessage['events'][number];
