/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Position } from '../../common/geometry.js';
import { type CuisineWord } from '../../menus/cuisine-words.js';
import { CLIENT_CAPABILITIES } from '../feature.js';
import { type RecruitingQuestDto } from '../../quests/dto/quest.dto.js';
import type { LocationMissing, WithMark, WithMissing } from '../refusals/refusal.dto.js';
import { type RelaxOffer } from '../refusals/relax.dto.js';
import { type PlanInput, planInputSchema } from './plan-input.dto.js';

// The contract of an answer drawn on the map, declared with the same shape in the app's Assistant types. Times are
// Korea time with the offset, clock times are HH:MM, and walks are whole minutes.

// What the app knows when the User asks.
export interface RequestContext {
  location: Position | null;
  locationMissing: LocationMissing;
  // The visible map area.
  viewport: { south: number; west: number; north: number; east: number } | null;
  tapped: { kind: 'place'; placeId: string } | { kind: 'friend'; userId: string } | null;
  // The condition chips of the answer on screen.
  conditions: PlanInput | null;
  // The plan on screen.
  planId: string | null;
}

export interface AnswerReply extends WithMissing {
  // Sent back, changed, to recalculate.
  input: PlanInput;
  chips: ConditionChip[];
  // The Assistant's pick first; the arrows browse the rest.
  plans: Plan[];
  // Considered, but they do not fit.
  dropped: DroppedPlace[];
  // `relax` when nothing fits 지금: one button for each condition to ease.
  noPlan: { reason: 'no-menu' | 'no-shared-time' | 'no-fit'; lines: AnswerLine[]; relax?: RelaxOffer[] } | null;
  // A meal's: the other meal of the day and when it starts ("HH:MM", now when it is under way), which the app's bar
  // offers; null when it is over or no Restaurant serves it that day. Absent from other answers.
  otherMeal?: { meal: 'lunch' | 'dinner'; start: string } | null;
  // A meal's or a meeting's: the asker's Quest the plans set aside, which making one replaces; null when none (P05 ticket
  // 17). For one release `mealSet` names a meal's beside it.
  planSet?: KeptQuestDto | null;
  // A meal's or a meeting's: the asker's other Quests of that day of the kind asked for or with a Friend asked for, at
  // most three, nearest the time asked first, named whether or not they limit the plans.
  related?: KeptQuestDto[];
  // A meal's: the Quest the asker already holds for that meal and day, which the plans set aside and making one replaces;
  // null when none. `shared` when another holds it or is invited: it is never replaced from a new Plan.
  mealSet?: {
    questId: string;
    title: string;
    startAt: string;
    place: string;
    friendNames: string[];
    shared: boolean;
  } | null;
}

// One of the User's Quests as the app reads it: those set aside by a plan (`planSet`), related to one (`related`), and
// those a day's Lookup was asked about (`kept`). `people` are the others of it, never the User; `changeable` when the
// User may change it here.
export interface KeptQuestDto {
  kind: 'meal-lunch' | 'meal-dinner' | 'meet' | 'event' | 'seat' | 'other';
  questId: string;
  title: string;
  startAt: string;
  endAt: string | null;
  place: string | null;
  people: { name: string; answer: 'leads' | 'accepted' | 'waiting' | 'declined' }[];
  mine: boolean;
  changeable: boolean;
}

// `from` is the start the User fixed for a meet. `area` is the visible map area and `what` the kind of place asked for,
// of "이 근처".
export interface ConditionChip extends WithMark {
  kind: 'origin' | 'from' | 'until' | 'person' | 'area' | 'what';
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
  // Each person's part there, given for the Place the input fixed.
  parts?: PlanPart[];
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
  // At most three.
  lines: AnswerLine[];
  basis: string[];
  scene: MapScene;
  band: TimeBand;
  // A recruiting Quest's Plan: the Quest as the recruiting list gives it, and the names of the Friends who hold it.
  quest?: RecruitingQuestDto;
  friendNames?: string[];
  // A new recruiting Quest's Plan: the Friends free then who are not in it, each with the line of their day.
  candidates?: { userId: string; name: string; line: string }[];
  // A Global Event's Plan: the event's own start and end, Korea time with the offset (end null when it has none). Its
  // startAt is the asker's arrival when the event is under way, and is never the event's time.
  event?: { startAt: string; endAt: string | null };
  // A meal Plan's menu: its Restaurant's main corner, its own price and its dishes in the menu's order. Absent when no
  // menu was collected for the meal there.
  menu?: PlanMenu;
}

export interface MenuDish {
  name: string;
  price: number | null;
  // Its kind of food, for the app's chips; null for a side dish, rice, a drink and the like, and for a name not read yet.
  cuisine: CuisineWord | null;
}

export interface PlanMenu {
  // The corner's one price from its heading, a buffet's or a self corner's ("<뷔페> 6,500원"), null when it has none;
  // its dishes then have none of their own.
  price: number | null;
  dishes: MenuDish[];
}

export interface PlanPart {
  userId: string;
  name: string;
  me: boolean;
  // Null when the position is unknown.
  origin: { place: PlacePoint; basis: 'timetable' | 'location' | 'chosen' } | null;
  leaveAt: string | null;
  walkMinutes: number | null;
  // The earliest they can be at the place, null when the position is unknown. Given by a meal's and a meet's Plans.
  arriveAt?: string | null;
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

// `leave` is when to set out, `late` an arrival after the deadline, `shuttle` the stop a shuttle passed last, `away`
// the edge of the visible area towards a Place outside it.
type FlagRole = 'place' | 'meeting' | 'leave' | 'late' | 'shuttle' | 'away';

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
  // `order`: the number a place carries in a list (1, 2, 3), as a day's Classes or the Tutorial Quests in order.
  places: { place: PlacePoint; role: PlaceRole; tag: string | null; order?: number }[];
  // `mode` is absent for a walk.
  routes: {
    userId: string;
    role: RouteRole;
    from: Position;
    to: Position;
    minutes: number;
    mode?: 'walk' | 'shuttle';
  }[];
  // `placeId`: the Place an `away` flag points to.
  flags: { at: Position; text: string; role: FlagRole; placeId?: string }[];
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

// One request of a message that asked for several (P03): a seat or room booked through a library card, or a plan drawn
// on the map. A reply carries its steps, in time order, only when there are two or more.
export interface ReplyStep {
  kind: 'seat' | 'room' | PlanInput['kind'];
  // What it is, in words: "7층 7A 열람실 2 구역", "901동에서 저녁".
  title: string;
  place: PlacePoint | null;
  // Where the User sets out from for it: the place of the step before it, unless they named another.
  from: PlacePoint | null;
  // Null when the step has no time.
  startAt: string | null;
  endAt: string | null;
  // `shown`: its card or its answer is in the reply. `not-done`: it could not be done, for `reason`.
  status: 'shown' | 'not-done';
  reason: string | null;
  // Where the reply shows it: the library card of that key, or the answer.
  shows: { kind: 'card'; key: string } | { kind: 'answer' } | null;
}

export type { CardFact, Lookup, LookupAction, LookupCard } from './lookup.dto.js';
export type { AnswerOffer, LocationMissing } from '../refusals/refusal.dto.js';
export type {
  EventsInput,
  MealInput,
  MeetInput,
  NewQuestInput,
  PersonConstraint,
  PlanInput,
  PlanPerson,
  QuestsInput,
} from './plan-input.dto.js';
export { EVENT_IDS_MAX, planInputSchema, QUEST_IDS_MAX } from './plan-input.dto.js';

const PLAN_ID_MAX = 200;

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

const tappedSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('place'), placeId: z.uuid() }),
  z.strictObject({ kind: z.literal('friend'), userId: z.uuid() }),
]);
const locationMissingSchema = z.enum(['permission', 'off-campus']).nullable().default(null);

export const requestContextSchema = z.strictObject({
  location: z.strictObject({ latitude, longitude }).nullable().default(null),
  locationMissing: locationMissingSchema,
  viewport: z
    .strictObject({ south: latitude, west: longitude, north: latitude, east: longitude })
    .nullable()
    .default(null),
  tapped: tappedSchema.nullable().default(null),
  conditions: planInputSchema.nullable().default(null),
  planId: z.string().min(1).max(PLAN_ID_MAX).nullable().default(null),
}) satisfies z.ZodType<RequestContext>;

// The body of a recalculation: the changed input, and where the asker is now or why that is not sent.
export const recalculationSchema = z.strictObject({
  input: planInputSchema,
  location: z.strictObject({ latitude, longitude }).nullable().default(null),
  locationMissing: locationMissingSchema,
  // What the app draws, as the chat request says it: `plan-set` sets a meeting aside here too.
  clientCapabilities: z.array(z.enum(CLIENT_CAPABILITIES)).max(CLIENT_CAPABILITIES.length).default([]),
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
  locationMissing: null,
  viewport: null,
  tapped: null,
  conditions: null,
  planId: null,
};
