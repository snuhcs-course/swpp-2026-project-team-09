/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { QuestBoard } from '../../generated/prisma/client.js';
import { CUISINE_WORD_LIST, type CuisineWord } from '../../menus/cuisine-words.js';
import { clockTime } from '../free-time/tool-parts.js';
import { mealWindowSchema } from '../refusals/relax.dto.js';

// The conditions of a plan, part of the contract of `answer.dto.ts`, which exports them again.

// The conditions of a plan: what a recalculation needs, and nothing the server can read itself.
export type PlanInput = MealInput | EventsInput | QuestsInput | NewQuestInput | MeetInput;

export interface MealInput {
  kind: 'meal';
  // YYYY-MM-DD in Korea.
  date: string;
  meal: 'lunch' | 'dinner';
  // Everyone of the plan, the asker first.
  people: PlanPerson[];
  // What the User fixed on the time band or in words. `now`: the User said 지금; with `from` too, it was eased to it.
  window: { from: string | null; until: string | null; now?: boolean };
  // The Place the User fixed.
  placeId: string | null;
  // The kind of food on screen: the plans of the Restaurants that serve it come first. Absent or null for none.
  cuisine?: CuisineWord | null;
  // The highest price per person in won (P05 ticket 53): the Restaurants whose list price is at or under it come first,
  // the others after them. Absent for none.
  maxPrice?: number;
  // The cheapest first, by list price (싼 데). Absent for the usual order.
  cheapFirst?: true;
}

// When the asker and their Friends are free together that day, and where they meet.
export interface MeetInput {
  kind: 'meet';
  // YYYY-MM-DD in Korea.
  date: string;
  // The asker first, then the Friends.
  people: PlanPerson[];
  window: { from: string | null; until: string | null };
  placeId: string | null;
}

// The Global Events of a day the asker can attend.
export interface EventsInput {
  kind: 'events';
  // YYYY-MM-DD in Korea.
  date: string;
  // Only these, as a search or a mark gave them; null for every event of the day.
  eventIds: string[] | null;
}

// Recruiting Quests the asker could join: those going to a Global Event, or those a search gave. One of the two.
export interface QuestsInput {
  kind: 'quests';
  globalEventId: string | null;
  questIds: string[] | null;
}

// A recruiting Quest the asker would make: for a Global Event at its Place, or for an activity at a Place.
export interface NewQuestInput {
  kind: 'new-quest';
  // YYYY-MM-DD in Korea.
  date: string;
  globalEventId: string | null;
  // Without a Global Event: what the User asked for ("배드민턴"), and the Place they said or the answer chose.
  title: string | null;
  placeId: string | null;
  // HH:MM the User said; null for the earliest everyone can be there.
  time: string | null;
  // The asker first, then the Friends to invite.
  people: PlanPerson[];
  // The Board it is posted on; Hobby when left out.
  board?: QuestBoard;
}

export interface PlanPerson {
  userId: string;
  constraints: PersonConstraint[];
}

// `source` says who set it: the asker (words, a tap, a drag) or the person it is about.
export type PersonConstraint =
  | { kind: 'from'; placeId: string; source: 'asker' | 'person' }
  | { kind: 'notBefore'; time: string; source: 'asker' | 'person' }
  | { kind: 'leaveBy'; time: string; source: 'asker' | 'person' };

// The most people of a plan, and the most constraints on each.
const PEOPLE_MAX = 8;
const CONSTRAINTS_MAX = 8;
// The most events an answer of events is asked for by id, and the most Quests an answer of Quests.
export const EVENT_IDS_MAX = 20;
export const QUEST_IDS_MAX = 20;
// The longest title of a new Quest, as a Quest's title.
const TITLE_MAX = 50;
// A meal's price ceiling, in won: far above any meal on the campus.
export const MAX_PRICE = 100_000;

const constraintSource = z.enum(['asker', 'person']);

const personConstraintSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('from'), placeId: z.uuid(), source: constraintSource }),
  z.strictObject({ kind: z.literal('notBefore'), time: clockTime, source: constraintSource }),
  z.strictObject({ kind: z.literal('leaveBy'), time: clockTime, source: constraintSource }),
]);

const planPeopleSchema = z
  .array(z.strictObject({ userId: z.uuid(), constraints: z.array(personConstraintSchema).max(CONSTRAINTS_MAX) }))
  .max(PEOPLE_MAX);

const windowSchema = z
  .strictObject({ from: clockTime.nullable(), until: clockTime.nullable() })
  .refine(({ from, until }) => from === null || until === null || from < until, 'Expected from before until');

const mealInputSchema = z.strictObject({
  kind: z.literal('meal'),
  date: z.iso.date(),
  meal: z.enum(['lunch', 'dinner']),
  people: planPeopleSchema.min(1),
  window: mealWindowSchema,
  placeId: z.uuid().nullable(),
  cuisine: z.enum(CUISINE_WORD_LIST).nullable().optional(),
  maxPrice: z.number().int().positive().max(MAX_PRICE).optional(),
  cheapFirst: z.literal(true).optional(),
});

// A meet has a Friend: without one there is nobody to meet.
const meetInputSchema = z.strictObject({
  kind: z.literal('meet'),
  date: z.iso.date(),
  people: planPeopleSchema.min(2),
  window: windowSchema,
  placeId: z.uuid().nullable(),
});

const eventsInputSchema = z.strictObject({
  kind: z.literal('events'),
  date: z.iso.date(),
  eventIds: z.array(z.uuid()).max(EVENT_IDS_MAX).nullable(),
});

const questsInputSchema = z
  .strictObject({
    kind: z.literal('quests'),
    globalEventId: z.uuid().nullable(),
    questIds: z.array(z.uuid()).min(1).max(QUEST_IDS_MAX).nullable(),
  })
  .refine(
    ({ globalEventId, questIds }) => (globalEventId === null) !== (questIds === null),
    'Expected a Global Event or Quests',
  );

// A new Quest's people carry no constraints.
const newQuestInputSchema = z
  .strictObject({
    kind: z.literal('new-quest'),
    date: z.iso.date(),
    globalEventId: z.uuid().nullable(),
    title: z.string().trim().min(1).max(TITLE_MAX).nullable(),
    placeId: z.uuid().nullable(),
    time: clockTime.nullable(),
    people: z
      .array(z.strictObject({ userId: z.uuid(), constraints: z.array(personConstraintSchema).max(0) }))
      .min(1)
      .max(PEOPLE_MAX),
    board: z.enum(QuestBoard).optional(),
  })
  .refine(
    ({ globalEventId, title, placeId }) =>
      globalEventId === null ? title !== null && placeId !== null : title === null && placeId === null,
    'Expected a Global Event, or a title and a Place',
  );

export const planInputSchema = z.discriminatedUnion('kind', [
  mealInputSchema,
  eventsInputSchema,
  questsInputSchema,
  newQuestInputSchema,
  meetInputSchema,
]);
