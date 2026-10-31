/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

// The shape of eval/p5/world.yaml, which holds the P05 world by seed name, and what reads it. eval/p5/world.ts seeds
// it.

const profileSchema = z.strictObject({ name: z.string(), department: z.string() });

const placeSchema = z.union([
  z.strictObject({ seed: z.string() }),
  z.strictObject({ label: z.string() }),
  z.strictObject({ label: z.string(), latitude: z.number(), longitude: z.number() }),
]);

const boardSchema = z.enum(['meal', 'career', 'hobby', 'show']);

// What a Quest holds besides its time and place, which a Quest for a Global Event takes from the event.
const questFields = {
  title: z.string(),
  joinPolicy: z.enum(['open', 'approval', 'closed']).default('open'),
  capacity: z.int().min(1),
  holders: z.int().min(1),
};

const timedFields = {
  starts: z.string(),
  ends: z.string().optional(),
  place: placeSchema,
};

const othersQuestSchema = z.union([
  z.strictObject({
    ...questFields,
    board: boardSchema,
    askedByAsker: z.boolean().default(false),
    ...timedFields,
  }),
  z.strictObject({
    ...questFields,
    board: boardSchema,
    askedByAsker: z.boolean().default(false),
    globalEvent: z.string(),
  }),
]);

const askersQuestSchema = z.strictObject({
  ...questFields,
  role: z.enum(['closed', 'leads', 'joined']),
  board: boardSchema.nullable(),
  ...timedFields,
});

const worldSchema = z.strictObject({
  asker: profileSchema,
  people: z.array(profileSchema).min(1),
  places: z.record(z.string(), z.string()),
  distances: z.array(z.strictObject({ between: z.tuple([z.string(), z.string()]), metres: z.int() })),
  pointDistances: z.array(z.strictObject({ label: z.string(), place: z.string(), metres: z.int() })),
  globalEvents: z.array(
    z.strictObject({
      title: z.string(),
      description: z.string(),
      starts: z.string(),
      ends: z.string().nullable(),
      place: z.string(),
      point: z.strictObject({ latitude: z.number(), longitude: z.number() }),
    }),
  ),
  sharedQuest: z.string(),
  heldByAsker: z.array(askersQuestSchema),
  quests: z.array(othersQuestSchema),
});

export type P5WorldData = z.infer<typeof worldSchema>;
export type OthersQuest = z.infer<typeof othersQuestSchema>;
export type AskersQuest = z.infer<typeof askersQuestSchema>;

export function p5WorldData(): P5WorldData {
  return worldSchema.parse(parse(readFileSync(new URL('world.yaml', import.meta.url), 'utf8')));
}
