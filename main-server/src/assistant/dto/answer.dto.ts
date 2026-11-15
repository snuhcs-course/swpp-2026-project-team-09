/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Position } from '../../common/geometry.js';
import { QuestBoard } from '../../generated/prisma/client.js';
import { type RecruitingQuestDto } from '../../quests/dto/quest.dto.js';
import { clockTime } from '../free-time/tool-parts.js';

// The contract of an answer drawn on the map, declared with the same shape in the app's Assistant types. Times are
// Korea time with the offset, clock times are HH:MM, and walks are whole minutes.

// What the app knows when the User asks.
export interface RequestContext {
  location: Position | null;
  // The visible map area.
  viewport: { south: number; west: number; north: number; east: number } | null;
  tapped: { kind: 'place'; placeId: string } | { kind: 'friend'; userId: string } | null;
  // The condition chips of the answer on screen.
  conditions: PlanInput | null;
  // The plan on screen.
  planId: string | null;
}

// The conditions of a plan: what a recalculation needs, and nothing the server can read itself.
export type PlanInput = MealInput | EventsInput | QuestsInput | NewQuestInput | MeetInput;

export interface MealInput {
  kind: 'meal';
  // YYYY-MM-DD in Korea.
  date: string;
  meal: 'lunch' | 'dinner';
  // Everyone of the plan, the asker first.
  people: PlanPerson[];
  // What the User fixed on the time band or in words.
  window: { from: string | null; until: string | null };
  // The Place the User fixed.
  placeId: string | null;
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

export interface AnswerReply {
  // Sent back, changed, to recalculate.
  input: PlanInput;
  chips: ConditionChip[];
  // The Assistant's pick first; the arrows browse the rest.
  plans: Plan[];
  // Considered, but they do not fit.
  dropped: DroppedPlace[];
  noPlan: { reason: 'no-menu' | 'no-shared-time' | 'no-fit'; lines: AnswerLine[] } | null;
}

// `from` is the start the User fixed for a meet.
export interface ConditionChip {
  kind: 'origin' | 'from' | 'until' | 'person';
  text: string;
  userId: string | null;
}

export type AnswerLine = { text: string; strong: boolean }[];

export interface PlacePoint {
  placeId: string;
  label: string;
  latitude: number;
  longitude: number;
}

export interface DroppedPlace {
  place: PlacePoint;
  reason: string;
}

export interface Plan {
  // Unique within the answer.
  id: string;
  // The title of the Quest the plan becomes.
  title: string;
  place: PlacePoint;
  // When everyone is there.
  startAt: string;
  // When the first must leave.
  endAt: string;
  togetherMinutes: number;
  // The merging point.
  meeting: { place: PlacePoint; at: string; userIds: string[] } | null;
  // Each person's part of the plan, the asker first.
  parts: PlanPart[];
  // The Sub Quests of the Quest the plan becomes.
  subQuests: { at: string; placeId: string; title: string }[];
  // At most two.
  lines: AnswerLine[];
  basis: string[];
  scene: MapScene;
  band: TimeBand;
  // A recruiting Quest's Plan: the Quest as the recruiting list gives it, and the names of the Friends who hold it.
  quest?: RecruitingQuestDto;
  friendNames?: string[];
  // A new recruiting Quest's Plan: the Friends free then who are not in it, each with the line of their day.
  candidates?: { userId: string; name: string; line: string }[];
}

export interface PlanPart {
  userId: string;
  name: string;
  me: boolean;
  // Null when the position is unknown.
  origin: { place: PlacePoint; basis: 'timetable' | 'location' | 'chosen' } | null;
  leaveAt: string | null;
  walkMinutes: number | null;
  // Null when nothing follows.
  leaveBy: string | null;
  next: { startAt: string; place: PlacePoint | null } | null;
  // How they travel, absent for a walk.
  mode?: 'walk' | 'shuttle';
}

// A shuttle stop's point holds the stop's id, not a Place's.
type PlaceRole = 'pick' | 'candidate' | 'dropped' | 'next' | 'meeting' | 'stop';

// `shuttle` is a ride between two stops; `alt` is the way not taken, drawn faded.
type RouteRole = 'me' | 'friend' | 'next' | 'shuttle' | 'alt';

// `leave` is when to set out, `late` an arrival after the deadline, `shuttle` the stop a shuttle passed last.
type FlagRole = 'place' | 'meeting' | 'leave' | 'late' | 'shuttle';

// What the map draws, by meaning. The app decides colours, camera, and label sides.
export interface MapScene {
  people: {
    userId: string;
    name: string;
    me: boolean;
    // At 'building', the point of the Place the person is in.
    at: Position;
    // `building`: a Friend at the building they are in, as the Friend view shows them.
    source: 'exact' | 'building' | 'timetable';
    tag: string | null;
  }[];
  places: { place: PlacePoint; role: PlaceRole; tag: string | null }[];
  // `mode` is absent for a walk.
  routes: {
    userId: string;
    role: RouteRole;
    from: Position;
    to: Position;
    minutes: number;
    mode?: 'walk' | 'shuttle';
  }[];
  flags: { at: Position; text: string; role: FlagRole }[];
}

export interface TimeBand {
  range: { startAt: string; endAt: string };
  now: string;
  // A busy stretch of a Plan's band says what it is: "302동 수업", "수업", or "일정".
  lanes: { userId: string; name: string; busy: { startAt: string; endAt: string; label?: string }[] }[];
  startAt: string;
  endAt: string;
  text: string;
}

export type { CardFact, Lookup, LookupAction, LookupCard } from './lookup.dto.js';

// The most people of a plan, and the most constraints on each.
const PEOPLE_MAX = 8;
const CONSTRAINTS_MAX = 8;
const PLAN_ID_MAX = 200;
// The most events an answer of events is asked for by id, and the most Quests an answer of Quests.
export const EVENT_IDS_MAX = 20;
export const QUEST_IDS_MAX = 20;
// The longest title of a new Quest, as a Quest's title.
const TITLE_MAX = 50;

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
  window: windowSchema,
  placeId: z.uuid().nullable(),
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

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

const tappedSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('place'), placeId: z.uuid() }),
  z.strictObject({ kind: z.literal('friend'), userId: z.uuid() }),
]);

export const requestContextSchema = z.strictObject({
  location: z.strictObject({ latitude, longitude }).nullable().default(null),
  viewport: z
    .strictObject({ south: latitude, west: longitude, north: latitude, east: longitude })
    .nullable()
    .default(null),
  tapped: tappedSchema.nullable().default(null),
  conditions: planInputSchema.nullable().default(null),
  planId: z.string().min(1).max(PLAN_ID_MAX).nullable().default(null),
}) satisfies z.ZodType<RequestContext>;

// The body of a recalculation: the changed input, and where the asker is now.
export const recalculationSchema = z.strictObject({
  input: planInputSchema,
  location: z.strictObject({ latitude, longitude }).nullable().default(null),
});

export type Recalculation = z.infer<typeof recalculationSchema>;

// The body of a press on a building or a Friend's face, and where the asker is now.
export const tapSchema = z.strictObject({
  tapped: tappedSchema,
  location: z.strictObject({ latitude, longitude }).nullable().default(null),
});

export type Tap = z.infer<typeof tapSchema>;

export const NO_CONTEXT: RequestContext = {
  location: null,
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};
