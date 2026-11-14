/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Position } from '../../common/geometry.js';
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
export interface PlanInput {
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

export interface ConditionChip {
  kind: 'origin' | 'until' | 'person';
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
  // The party's title.
  title: string;
  place: PlacePoint;
  // When everyone is there.
  startAt: string;
  // When the first must leave.
  endAt: string;
  togetherMinutes: number;
  // The merging point.
  meeting: { place: PlacePoint; at: string; userIds: string[] } | null;
  // The asker first.
  members: PlanMember[];
  // The party's steps.
  steps: { at: string; placeId: string; title: string }[];
  // At most two.
  lines: AnswerLine[];
  basis: string[];
  scene: MapScene;
  band: TimeBand;
}

export interface PlanMember {
  userId: string;
  name: string;
  me: boolean;
  // Null when the position is unknown.
  origin: { place: PlacePoint; basis: 'timetable' | 'location' | 'chosen' } | null;
  leaveAt: string | null;
  walkMinutes: number | null;
  arriveAt: string | null;
  // Null when nothing follows.
  leaveBy: string | null;
  next: { startAt: string; place: PlacePoint | null } | null;
}

// What the map draws, by meaning. The app decides colours, camera and label sides.
export interface MapScene {
  people: {
    userId: string;
    name: string;
    me: boolean;
    at: Position;
    source: 'exact' | 'timetable';
    tag: string | null;
  }[];
  places: { place: PlacePoint; role: 'pick' | 'candidate' | 'dropped' | 'next' | 'meeting'; tag: string | null }[];
  routes: { userId: string; role: 'me' | 'friend' | 'next'; from: Position; to: Position; minutes: number }[];
  flags: { at: Position; text: string; role: 'place' | 'meeting' }[];
}

export interface TimeBand {
  range: { startAt: string; endAt: string };
  now: string;
  lanes: { userId: string; name: string; busy: { startAt: string; endAt: string }[] }[];
  startAt: string;
  endAt: string;
  text: string;
}

// The most people of a plan, and the most constraints on each.
const PEOPLE_MAX = 8;
const CONSTRAINTS_MAX = 8;
const PLAN_ID_MAX = 200;

const constraintSource = z.enum(['asker', 'person']);

const personConstraintSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('from'), placeId: z.uuid(), source: constraintSource }),
  z.strictObject({ kind: z.literal('notBefore'), time: clockTime, source: constraintSource }),
  z.strictObject({ kind: z.literal('leaveBy'), time: clockTime, source: constraintSource }),
]);

export const planInputSchema = z.strictObject({
  kind: z.literal('meal'),
  date: z.iso.date(),
  meal: z.enum(['lunch', 'dinner']),
  people: z
    .array(z.strictObject({ userId: z.uuid(), constraints: z.array(personConstraintSchema).max(CONSTRAINTS_MAX) }))
    .min(1)
    .max(PEOPLE_MAX),
  window: z.strictObject({ from: clockTime.nullable(), until: clockTime.nullable() }),
  placeId: z.uuid().nullable(),
});

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

export const requestContextSchema = z.strictObject({
  location: z.strictObject({ latitude, longitude }).nullable().default(null),
  viewport: z
    .strictObject({ south: latitude, west: longitude, north: latitude, east: longitude })
    .nullable()
    .default(null),
  tapped: z
    .discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('place'), placeId: z.uuid() }),
      z.strictObject({ kind: z.literal('friend'), userId: z.uuid() }),
    ])
    .nullable()
    .default(null),
  conditions: planInputSchema.nullable().default(null),
  planId: z.string().min(1).max(PLAN_ID_MAX).nullable().default(null),
}) satisfies z.ZodType<RequestContext>;

export const NO_CONTEXT: RequestContext = {
  location: null,
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};
