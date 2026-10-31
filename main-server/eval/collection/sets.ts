/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

// The fixed sets of evaluations A and B (P05 ticket 01), read from the files beside this one. See README.md there. What
// a set file says of an item is why it was chosen, not its answer: the answers are in the label files, which people
// fill in by reading the post. A null in a label file is a blank nobody has filled in yet.

export const COLLECTION_DIRECTORY = new URL('./', import.meta.url);

const partSchema = z.enum(['development', 'held-out']);

const postId = z.string().regex(/^(?:snu-\d+|extra-PGM\d+)$/u);

export const postsSchema = z.array(
  z.strictObject({
    post: postId,
    source: z.enum(['snu_events', 'extra_snu']),
    key: z.string().min(1),
    url: z.url(),
    fetchedAt: z.iso.datetime(),
  }),
);

export const POST_TAGS = [
  'no-event',
  'application-period-only',
  'image-only',
  'multi-session',
  'year-left-out',
  'building-number-alone',
  'over-a-period',
  'elsewhere',
  'online',
] as const;

export const setASchema = z.array(
  z.strictObject({
    id: z.string().regex(/^a-\d{3}$/u),
    post: postId,
    part: partSchema,
    tags: z.array(z.enum(POST_TAGS)),
  }),
);

export const POSITIVE_KINDS = ['body-link', 'different-title', 'many-to-one'] as const;
export const HARD_NEGATIVE_KINDS = ['in-person-or-online', 'another-round', 'same-time-another-event'] as const;

// One side of a pair: a post, and the session it is about when the post has several and the pair is about one of them.
const sideSchema = z.strictObject({ post: postId, session: z.int().positive().nullable() });

export const setBSchema = z.array(
  z.strictObject({
    id: z.string().regex(/^b-\d{3}$/u),
    a: sideSchema,
    b: sideSchema,
    part: partSchema,
    chosenAs: z.enum([...POSITIVE_KINDS, ...HARD_NEGATIVE_KINDS]),
    trap: z.boolean().default(false),
  }),
);

// A day, or a day and a minute, in Seoul's time, or `none` when the post gives none.
const timeLabel = z
  .string()
  .regex(/^(?:none|\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)$/u)
  .nullable();

const labelledBy = {
  labeller: z.string().nullable(),
  labelledOn: z.iso.date().nullable(),
};

export const labelsASchema = z.strictObject({
  ...labelledBy,
  items: z.array(
    z.strictObject({
      id: z.string(),
      title: z.string(),
      url: z.url(),
      file: z.string(),
      announcesEvent: z.boolean().nullable(),
      sessions: z.array(
        z.strictObject({
          n: z.int().positive(),
          start: timeLabel,
          end: timeLabel,
          // A row of labels/places.tsv, or `none` when the post names no Place.
          place: z.string().min(1).nullable(),
          overPeriod: z.boolean().nullable(),
          mayPublish: z.boolean().nullable(),
        }),
      ),
      note: z.string().nullable(),
    }),
  ),
});

const labelSideSchema = z.strictObject({
  title: z.string(),
  url: z.url(),
  file: z.string(),
  session: z.int().positive().nullable(),
});

export const labelsBSchema = z.strictObject({
  ...labelledBy,
  items: z.array(
    z.strictObject({
      id: z.string(),
      a: labelSideSchema,
      b: labelSideSchema,
      sameEvent: z.boolean().nullable(),
      note: z.string().nullable(),
    }),
  ),
});

const comparatorSchema = z.enum(['>=', '<=', '=']);

export const thresholdsSchema = z.strictObject({
  sets: z.strictObject({ a: z.string(), b: z.string() }),
  naive: z.strictObject({ a: z.string().min(1), b: z.string().min(1) }),
  whenAFloorIsMissed: z.strictObject({
    every: z.string().min(1),
    stopsAutomaticPublication: z.array(z.string()),
    stops: z.string().min(1),
  }),
  thresholds: z.array(
    z.strictObject({
      id: z.string().min(1),
      metric: z.string().regex(/^[CD]\d$/u),
      measure: z.string().min(1),
      kind: z.enum(['floor', 'target', 'diagnostic']),
      comparator: comparatorSchema.optional(),
      value: z.number().optional(),
      declared: z.iso.date(),
      note: z.string().optional(),
      // A later entry that changes an earlier one, which stays (metrics document, 4.1).
      revises: z.string().optional(),
      reason: z.string().optional(),
    }),
  ),
});

export type LabelsA = z.infer<typeof labelsASchema>;
export type LabelsB = z.infer<typeof labelsBSchema>;

export function readCollectionFile<Schema extends z.ZodType>(name: string, schema: Schema): z.infer<Schema> {
  const parsed = schema.safeParse(parse(readFileSync(new URL(name, COLLECTION_DIRECTORY), 'utf8')));
  if (!parsed.success) {
    throw new Error(`${name}: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export const LABEL_FILES = {
  aOwner: 'labels/a.owner.yaml',
  aSecond: 'labels/a.second.yaml',
  bOwner: 'labels/b.owner.yaml',
  bSecond: 'labels/b.second.yaml',
  aGold: 'labels/a.gold.yaml',
  bGold: 'labels/b.gold.yaml',
} as const;

// The Places a label can name, one a line after the header: label, number, name, id.
export function placeLabels(): Set<string> {
  const lines = readFileSync(new URL('labels/places.tsv', COLLECTION_DIRECTORY), 'utf8').trim().split('\n');
  return new Set(lines.slice(1).map((line) => line.split('\t')[0]));
}
