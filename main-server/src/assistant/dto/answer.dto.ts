/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlanStudy } from './study-plan.dto.js';
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
  // The plans of the meal answer on screen in its order, which the app numbers from 1 (P05 ticket 51). Left out by an app
  // before it.
  planIds?: string[];
  // The Friends the User's new message mentions with "@". Left out by an app before the mention, and checked against
  // the asker's Friends before anything reads it.
  mentions?: Mention[];
  // The asker's Classes the conversation leaves out, as the last reply gave them (`AssistantReplyDto.skipped`, P05
  // ticket 70). Left out by an app before it, and by any app until a reply gives them.
  skipped?: LeftOutClass[];
  // The conditions of every answer on screen, in the order of their steps, when a reply drew several (P05 ticket 73);
  // `conditions` is the one the User has open. Left out by an app that does not say `answers`.
  answers?: PlanInput[];
}

// One of the asker's Classes left out on one day: the id of its time in the Timetable, which repeats every week.
export interface LeftOutClass {
  date: string;
  classId: string;
}

// A Friend the User picked with "@" from their Friend list: exactly that Friend, never found by the name.
export interface Mention {
  userId: string;
  name: string;
}

export interface AnswerReply extends WithMissing {
  // Sent back, changed, to recalculate.
  input: PlanInput;
  chips: ConditionChip[];
  // The Assistant's pick first; the arrows browse the rest.
  plans: Plan[];
  // Considered, but they do not fit.
  dropped: DroppedPlace[];
  // A meal's: the Restaurants closed for the meal by their menu's notice, which the list names apart (P04 ticket 71).
  // Absent when none, and from other answers.
  closed?: ClosedPlace[];
  // `relax` when nothing fits 지금: one button for each condition to ease. `band`, for the time card of a meal's, a
  // meeting's, a study together's or a new party's (P05 ticket 65): everyone's lanes over the window asked, from now
  // when it has begun, and the window as its stretch. An app before it reads none.
  noPlan: {
    reason: 'no-menu' | 'no-shared-time' | 'no-fit';
    lines: AnswerLine[];
    relax?: RelaxOffer[];
    band?: TimeBand;
  } | null;
  // A meal's: the other meal of the day and when it starts ("HH:MM", now when it is under way), which the app's bar
  // offers; null when it is over or no Restaurant serves it that day. Absent from other answers.
  otherMeal?: { meal: 'lunch' | 'dinner'; start: string } | null;
  // A meal asked with company the User did not name (P04 ticket 73): the app opens the picking of Friends on the plan as
  // the answer arrives. Absent otherwise, and when nobody is left to pick.
  pickPeople?: true;
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
  // A meal's: the Friends the plans add to `planSet`, which 바꾸기 invites to that same Quest (P05 ticket 44), its
  // meal's start, and the start the first plan moves it to, null when it keeps it. Absent when the plans add nobody.
  adding?: {
    friends: { userId: string; name: string }[];
    startAt: string;
    movesTo: string | null;
  };
  // A menu question's: the Plan whose Restaurant was asked about, which the app opens at its menu as from the list (P04
  // ticket 72). Absent from any other answer.
  opened?: string;
  // A meal answer from a main server that takes `planIds`: only over such an answer does the app send them, so that a
  // newer app never sends a field an older main server refuses (P05 ticket 51). Absent from any other answer.
  choosable?: true;
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
  // Where it is, which the map marks: its first step's Place, null when that step has none or only words for one.
  point: PlacePoint | null;
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

// A Restaurant closed for the meal: its Place, and its menu's notice in its own lines ("공대수시면접으로 인해 휴점합니다").
export interface ClosedPlace {
  place: PlacePoint;
  notices: string[];
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
  // A study Plan's building (P10): its study spaces that fit, best first, which of 관정's to book, and whether the phone
  // reads its free seats. Absent from every other Plan.
  study?: PlanStudy;
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
  // How many other things are served that meal there, across every corner: the "외 N" of the menu's words, which the
  // map's label of the chosen place says too (P04 ticket 74). Absent from a main server before it.
  others?: number;
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
  // `by`: 'shuttle' when they go on to it by the shuttle, absent for a walk.
  next: { startAt: string; place: PlacePoint | null; by?: 'shuttle' } | null;
  // How they travel, absent for a walk.
  mode?: 'walk' | 'shuttle';
  // The stops of a way by the shuttle, by name ("301동", "경영대").
  shuttle?: { boardAt: string; getOffAt: string };
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
  // A meal's or a meeting's Plan: each of the asker's Friends not in the plan, in the order of their Friend list, for
  // the time card to offer adding before one recalculation. `busy` as a lane's. `walkMinutes` to the Plan's Place from
  // where they set out for it by the planner's rule for a picked person, null when that is not known; `after`, when
  // they set out from an item of their day, says it as a busy stretch's label ("83동 수업", "수업", "일정").
  others?: {
    userId: string;
    name: string;
    busy: { startAt: string; endAt: string; label?: string }[];
    walkMinutes: number | null;
    after?: string;
  }[];
  // The asker's Classes of the day the conversation leaves out (`RequestContext.skipped`, and a meal's
  // `MealInput.skipped`), whole, labelled as a lane's busy stretch, in a Plan's band of any kind. They are in no lane.
  // Absent for none.
  skipped?: { id: string; startAt: string; endAt: string; label: string }[];
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
export type { GroupRoomKind, PlanStudy, RoomRequestState, StudyGroup, StudySpot } from './study-plan.dto.js';
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
  StudyInput,
} from './plan-input.dto.js';
export { EVENT_IDS_MAX, planInputSchema, QUEST_IDS_MAX } from './plan-input.dto.js';

const PLAN_ID_MAX = 200;
// More plans than an answer lists is a wrong request.
const PLANS_MAX = 30;

const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);

const tappedSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('place'), placeId: z.uuid() }),
  z.strictObject({ kind: z.literal('friend'), userId: z.uuid() }),
]);
// More than an input holds of distinct Friends is a wrong request.
const MENTIONS_MAX = 20;
const NAME_MAX = 100;
const mentionSchema = z.strictObject({ userId: z.uuid(), name: z.string().trim().min(1).max(NAME_MAX) });
// More answers on screen than one message asks for is a wrong request.
const ANSWERS_MAX = 8;
// More than a conversation leaves out over its days is a wrong request.
const LEFT_OUT_MAX = 24;

export const leftOutSchema = z
  .array(z.strictObject({ date: z.iso.date(), classId: z.uuid() }))
  .max(LEFT_OUT_MAX) satisfies z.ZodType<LeftOutClass[]>;
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
  planIds: z.array(z.string().min(1).max(PLAN_ID_MAX)).max(PLANS_MAX).optional(),
  mentions: z.array(mentionSchema).max(MENTIONS_MAX).optional(),
  skipped: leftOutSchema.optional(),
  answers: z.array(planInputSchema).max(ANSWERS_MAX).optional(),
}) satisfies z.ZodType<RequestContext>;

// The body of a recalculation: the changed input, and where the asker is now or why that is not sent.
export const recalculationSchema = z.strictObject({
  input: planInputSchema,
  location: z.strictObject({ latitude, longitude }).nullable().default(null),
  locationMissing: locationMissingSchema,
  // What the app draws, as the chat request says it: `plan-set` sets a meeting aside here too.
  clientCapabilities: z.array(z.enum(CLIENT_CAPABILITIES)).max(CLIENT_CAPABILITIES.length).default([]),
  // The conversation's Classes left out, as the chat request sends them: the plan of any kind leaves those of its day out.
  skipped: leftOutSchema.optional(),
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
