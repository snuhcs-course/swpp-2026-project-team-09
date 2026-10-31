/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';

// The shape of eval/p4/world.yaml, which holds the P4 world by seed name, and what reads it. eval/p4/world.ts seeds it.

const profileSchema = z.strictObject({ name: z.string(), department: z.string() });

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;

const meetingSchema = z.strictObject({
  day: z.enum(WEEKDAYS),
  start: z.string(),
  end: z.string(),
  place: z.string().nullable(),
});

const classSchema = z.strictObject({ course: z.string(), meetings: z.array(meetingSchema).min(1) });

const placeSchema = z.union([
  z.strictObject({ seed: z.string() }),
  z.strictObject({ label: z.string() }),
  z.strictObject({ label: z.string(), latitude: z.number(), longitude: z.number() }),
]);

const subQuestSchema = z.strictObject({
  starts: z.string().optional(),
  ends: z.string().optional(),
  place: placeSchema,
});

const heldQuestSchema = z.strictObject({ title: z.string(), subQuest: subQuestSchema });

const friendSchema = profileSchema.extend({
  timetable: z.array(classSchema).default([]),
  quests: z.array(heldQuestSchema).default([]),
});

const recruitingSchema = z.strictObject({
  title: z.string(),
  board: z.enum(['meal', 'career', 'hobby', 'show']).optional(),
  joinPolicy: z.enum(['open', 'approval', 'closed']).default('open'),
  capacity: z.int().default(4),
  globalEvent: z.string().optional(),
  full: z.boolean().default(false),
  joinedByAsker: z.boolean().default(false),
  askedByAsker: z.boolean().default(false),
  subQuests: z.array(subQuestSchema).default([]),
});

const lineSchema = z.union([
  z.strictObject({ dish: z.string(), price: z.int() }),
  z.strictObject({ note: z.string() }),
]);

const restaurantDaySchema = z.strictObject({
  name: z.string(),
  breakfast: z.array(lineSchema).default([]),
  lunch: z.array(lineSchema).default([]),
  dinner: z.array(lineSchema).default([]),
});

const worldSchema = z.strictObject({
  asker: profileSchema,
  askers: z.record(z.string(), profileSchema),
  leader: profileSchema,
  joiner: profileSchema,
  places: z.record(z.string(), z.string().nullable()),
  restaurants: z.record(z.string(), z.string().nullable()),
  timetable: z.array(classSchema),
  ownQuests: z.array(heldQuestSchema),
  friends: z.record(z.string(), friendSchema),
  globalEvents: z.array(
    z.strictObject({
      title: z.string(),
      starts: z.string(),
      ends: z.string().nullable(),
      place: z.string(),
      point: z.strictObject({ latitude: z.number(), longitude: z.number() }),
    }),
  ),
  sharedQuest: z.string(),
  quests: z.array(recruitingSchema),
  // Facts of the shared seed's map, which the labels were worked from; nothing is seeded from them.
  mappedPoints: z.array(
    z.strictObject({
      latitude: z.number(),
      longitude: z.number(),
      exact: z.string().nullable(),
      lookup: z.string().nullable(),
      nearest: z.string(),
      metres: z.int(),
    }),
  ),
  menusCollectedAt: z.string(),
  menus: z.array(z.strictObject({ date: z.string(), restaurants: z.array(restaurantDaySchema) })),
});

export type WorldData = z.infer<typeof worldSchema>;
export type Recruiting = z.infer<typeof recruitingSchema>;
export type SubQuest = z.infer<typeof subQuestSchema>;
export type HeldQuest = z.infer<typeof heldQuestSchema>;
export type RestaurantDay = z.infer<typeof restaurantDaySchema>;
export type Weekday = (typeof WEEKDAYS)[number];

export function worldData(): WorldData {
  return worldSchema.parse(parse(readFileSync(new URL('world.yaml', import.meta.url), 'utf8')));
}
