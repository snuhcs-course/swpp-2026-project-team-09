/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PersonConstraint } from './constraint-types';
import type { TimeBand } from './time-band-types';
import type { LeftOutClass } from './left-out-types';
import type { LibraryCard } from './library-card-types';
import type { Lookup } from './lookup-types';
import type { MealPrice, MeetInput } from './meet-plan-types';
import type { MenuLine } from './menu-types';
import type { RecruitingQuest } from './party-types';
import type { ClosedPlace, DroppedPlace, PlanPart, WithAdding } from './plan-part-types';
import type { ProposalChange } from './party-change-types';
import type { ReplyOffer } from './reply-offer-types';
import type { ReplyStep } from './reply-step-types';
import type { WithLocationMissing, WithMark, WithMissing, WithRefusal } from './refusal-types';
import type { MealWindow, WithRelax } from './relax-types';
import type { NewQuestInput, QuestsInput } from './recruiting-plan-types';
import type { FlagRole, PlaceRole, RouteRole } from './scene-roles';
import type { Board, GlobalEvent, JoinPolicy, LatLng } from './types';
import type { SentProposal } from './sent-proposal';
import type { PlanStudy, StudyInput } from './study-plan-types';

// --- The Assistant (POST /assistant/messages) ---

// A card the Assistant showed, by what it is and its id, which for a Restaurant and a library card is its key. The
// server is sent only these, never the card's data.
export interface CardReference {
  kind: 'quest' | 'globalEvent' | 'restaurant' | 'library';
  id: string;
}

export { ANSWER_CAPABILITIES } from './capabilities';

export type { ReplyStep };

// A Place or a Friend of a Proposal, by id and the words the card shows: the Place's name, the Friend's name. Never
// where a Friend is.
// Where a Place's facilities are booked online: the page 시설 예약하기 opens on a made Proposal.
export interface FacilityBooking {
  label: string;
  url: string;
}

// A Place with its booking page, null where it has none. A main server before P13-06 leaves it out.
export interface ProposalPlace {
  id: string;
  name: string;
  booking?: FacilityBooking | null;
}

export interface ProposalFriend {
  id: string;
  name: string;
}

// A Proposal: a 파티 the Assistant filled in from what the User wrote, which does not exist until the User makes it
// with the card's 만들기. An Open Quest is the form's 공개 · 바로 참여, an Approval one its 공개 · 승인 후 참여, on a
// Board, and a Closed one its 비공개, on none. `startsAt` is in Korea time with its offset. The Global Event is whole,
// as the 행사 tab lists it, and the Friends are those to invite.
export interface QuestProposal {
  title: string;
  description: string;
  joinPolicy: JoinPolicy;
  board: Board | null;
  capacity: number;
  startsAt: string;
  place: ProposalPlace | null;
  globalEvent: GlobalEvent | null;
  invitees: ProposalFriend[];
  change?: ProposalChange;
}

export { type SentProposal, sentProposalOf } from './sent-proposal';

// One message of the conversation, as the app sends it: the User's text, or the Assistant's with the cards it showed
// and, on the last that made one, its Proposal by its values.
export type ChatMessage =
  { role: 'user'; text: string } | { role: 'assistant'; text: string; cards: CardReference[]; proposal?: SentProposal };

// What the main server takes (main-server README: Assistant): the latest 20 messages, a User's of at most 1,000
// characters, and at most 24,000 characters together, a Proposal's text and names included.
export const CHAT_HISTORY_MAX = 20;
export const USER_MESSAGE_MAX = 1000;
export const MESSAGES_TOTAL_MAX = 24_000;

// The layers of the map a reply can show with a button: the restaurants and the shuttle.
export const MAP_LAYERS = ['dining', 'shuttle'] as const;

export type MapLayer = (typeof MAP_LAYERS)[number];

// The 이동 시간 box of a card of a 공강 파티 answer: the way there, then the way to the next item, or the time to leave
// by ("HH:MM") with whether the end is unknown. Each is there only when it applies.
export interface TravelBox {
  travel?: { mode: 'walk' | 'shuttle'; minutes: number };
  next?: { minutes: number; isClass: boolean };
  leaveBy?: string;
  endUnknown?: boolean;
}

// A card of a reply, in the shape of the list the app draws it from: a Global Event as the 행사 tab lists it, and a
// recruiting Quest as the Boards list it.
export interface GlobalEventCard extends TravelBox {
  kind: 'globalEvent';
  globalEvent: GlobalEvent;
}

export interface QuestCard extends TravelBox {
  kind: 'quest';
  quest: RecruitingQuest;
}

// One person's Travel Time to a Restaurant: `name` is 나 for the User, and an unknown one has no mode and no minutes
// ("—"). `longest` marks the most minutes of the card.
export interface RestaurantTravel {
  name: string;
  mode: 'walk' | 'shuttle' | null;
  minutes: number | null;
  longest: boolean;
}

// A Restaurant of a 공강에 밥 answer: its Place's number, the day and the meal, how long there is to eat, its lines that
// are not notes, each person's Travel Time, and the 파티 its 파티 만들기 fills the form with.
export interface RestaurantCard {
  kind: 'restaurant';
  restaurant: {
    key: string;
    name: string;
    placeNumber: string | null;
    date: string;
    meal: 'lunch' | 'dinner';
    eatingMinutes: number;
    lines: MenuLine[];
    // The meal's hours that day, "HH:MM"; null when none were kept. Absent from a main server before P05 ticket 12.
    hours?: { opensAt: string; closesAt: string } | null;
    people: RestaurantTravel[];
    proposal: QuestProposal;
  };
}

export type { LibraryAction, LibraryCard, LibraryCardData, LibrarySpace } from './library-card-types';

export type ChatCard = GlobalEventCard | QuestCard | RestaurantCard | LibraryCard;

// The characters a Proposal counts for, as the main server counts them (proposalLength): its title, its description,
// and the names of its Place, its event and its Friends.
function proposalLength({ title, description, place, globalEvent, invitees }: SentProposal): number {
  const names = [place?.name ?? '', globalEvent?.title ?? '', ...invitees.map(({ name }) => name)];
  return [title, description, ...names].reduce((total, words) => total + words.length, 0);
}

// The characters a message counts for against MESSAGES_TOTAL_MAX: its text, and its Proposal's.
export function lengthOf(message: ChatMessage): number {
  const proposal = message.role === 'assistant' ? message.proposal : undefined;
  return message.text.length + (proposal === undefined ? 0 : proposalLength(proposal));
}

// What a later request sends of a card: what it is and its id, never its data.
export function referenceOf(card: ChatCard): CardReference {
  if (card.kind === 'restaurant') {
    return { kind: card.kind, id: card.restaurant.key };
  }
  if (card.kind === 'library') {
    return { kind: card.kind, id: card.library.key };
  }
  return { kind: card.kind, id: card.kind === 'quest' ? card.quest.id : card.globalEvent.id };
}

// --- An answer drawn on the map (main-server `assistant/dto/answer.dto.ts`, the same shapes) ---

// Times are Korea time with the offset, clock times are HH:MM, and walks are whole minutes.

// What the app knows when the User asks, each part null when it does not know it.
export interface RequestContext extends WithLocationMissing {
  location: LatLng | null;
  // The visible map area.
  viewport: { south: number; west: number; north: number; east: number } | null;
  tapped: { kind: 'place'; placeId: string } | { kind: 'friend'; userId: string } | null;
  // The condition chips of the answer on screen.
  conditions: PlanInput | null;
  // The plan on screen.
  planId: string | null;
  // The plans of the meal answer on screen in its order, which the list and the map number from 1, so that "2번으로
  // 할게" chooses one of them (P05 ticket 51). Left out without a meal answer on screen that says `choosable`.
  planIds?: string[];
  // With steps on screen, for an app that says `answers` (P03 ticket 20): the conditions of every answer of the steps in
  // their order, and the steps whole as the last reply gave them. Left out otherwise; a main server before P05 ticket 73
  // and 74 refuses them.
  answers?: PlanInput[];
  steps?: ReplyStep[];
  // The User's Classes the conversation leaves out, as the latest reply gave them (P01 ticket 40). Left out for none.
  skipped?: LeftOutClass[];
}

// The conditions of a plan: what a recalculation needs, and nothing the server can read itself.
export type PlanInput = MealInput | EventsInput | QuestsInput | NewQuestInput | MeetInput | StudyInput;

export interface MealInput extends MealPrice {
  kind: 'meal';
  // YYYY-MM-DD in Korea.
  date: string;
  meal: 'lunch' | 'dinner';
  // Everyone of the plan, the asker first.
  people: PlanPerson[];
  // What the User fixed on the time band or in words.
  window: MealWindow;
  // The Place the User fixed.
  placeId: string | null;
  // The asker's Classes of the day left out of the plan, as the ids of their times (P04 ticket 93); absent for none,
  // and from a main server before it. The app only sends back those the main server gave.
  skipped?: string[];
  // The kind of food on screen, which the main server keeps and puts first. Absent or null for none.
  cuisine?: Cuisine | null;
}

// The Global Events of a day the asker can attend.
export interface EventsInput {
  kind: 'events';
  // YYYY-MM-DD in Korea.
  date: string;
  // Only these, as a search or a mark gave them; null for every event of the day.
  eventIds: string[] | null;
}

export interface PlanPerson {
  userId: string;
  constraints: PersonConstraint[];
}

export type { ConstraintSource, PersonConstraint } from './constraint-types';

export interface AnswerReply extends WithMissing, WithAdding {
  // The request it answers, the main server's name for it, in a reply's `answers` and a recalculation's answer to an app
  // that says `answers` (P03 ticket 20). Opaque: the app compares it and never builds it.
  key?: string;
  // Sent back, changed, to recalculate.
  input: PlanInput;
  chips: ConditionChip[];
  // The Assistant's pick first; the arrows browse the rest.
  plans: Plan[];
  // Considered, but they do not fit.
  dropped: DroppedPlace[];
  // A meal's: the Restaurants closed for the meal, which the list names apart under "쉬는 곳" (P04 ticket 71). Absent
  // when none, from other answers, and from a main server before it.
  closed?: ClosedPlace[];
  // `band`, the time card over the window asked for, with everyone's lane, the Friends to add and the Classes left out,
  // so that a card with no Plan keeps what was asked (P01 ticket 31); absent from a main server before it.
  noPlan:
    ({ reason: 'no-menu' | 'no-shared-time' | 'no-fit'; lines: AnswerLine[]; band?: TimeBand } & WithRelax) | null;
  // A meal asked with company the User did not name (P04 ticket 73): picking opens on the Plan as the answer arrives.
  // Absent otherwise, when nobody is left to pick, and from a main server before it.
  pickPeople?: true;
  // A meal's: the Quest the User already holds for that meal and day, which the plans set aside and making one replaces
  // (바꾸기); null when none. `shared` when another holds it or is invited: making a Plan then answers 409
  // MEAL_ALREADY_SET, and it is changed in that Quest. Absent from other answers and from a main server before P05
  // ticket 16.
  mealSet?: MealSet | null;
  // A meal's or a meeting's: the User's Quest the plans set aside (바꾸기 when `changeable`, else 파티 보기), and their
  // other Quests that day of the kind asked for or with a Friend asked for, at most three. Absent from a main server
  // before P05 ticket 17, which sends `mealSet` beside `planSet` for one release.
  planSet?: KeptQuest | null;
  related?: KeptQuest[];
  // A menu question's: the Plan whose Restaurant was asked about, which the answer opens at, its menu shown as from the
  // list (P04 ticket 72). Absent from other answers and from a main server before it.
  opened?: string;
  // A meal answer from a main server that takes `planIds` (P05 ticket 51): only over such an answer does the app send
  // them, since an older main server refuses a request that carries them.
  choosable?: true;
}

// One of the User's Quests as the main server names it (P05 ticket 17): set aside by a plan, related to one, or asked
// about in a day's Lookup. `people` are the others of it, never the User; `changeable` when the User may change it from
// the Assistant (theirs, shared with nobody, for no event or seat, not under way).
export interface KeptQuest {
  kind: 'meal-lunch' | 'meal-dinner' | 'meet' | 'event' | 'seat' | 'other';
  questId: string;
  title: string;
  startAt: string;
  endAt: string | null;
  place: string | null;
  // Where it is on the map, its first step's Place: null when that step has none or only words for one, absent from a
  // main server before P05 ticket 28.
  point?: PlacePoint | null;
  people: { name: string; answer: 'leads' | 'accepted' | 'waiting' | 'declined' }[];
  mine: boolean;
  changeable: boolean;
}

export interface MealSet {
  questId: string;
  title: string;
  startAt: string;
  place: string;
  friendNames: string[];
  shared: boolean;
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
  quest?: RecruitingQuest;
  friendNames?: string[];
  // A new recruiting Quest's Plan: the Friends free then who are not in it, each with the line of their day.
  candidates?: { userId: string; name: string; line: string }[];
  // A Global Event's Plan: the event's own start and end, Korea time with the offset (end null when it has none). Its
  // startAt is the asker's arrival when the event is under way, and is never the event's time.
  event?: { startAt: string; endAt: string | null };
  // A meal Plan's menu: its Restaurant's main corner, its own price (a buffet's or a self corner's, from its heading, null
  // when it has none) and its dishes in the menu's order. Absent when no menu was collected for the meal there, and
  // from a main server before P05 ticket 12's follow-up. `others`: how many other things are served that meal there,
  // across every corner, the "외 N" of the menu's words (P04 ticket 74); absent from a main server before it.
  menu?: { price: number | null; dishes: MenuDish[]; others?: number };
  // A study Plan's part (P10): with Friends, its 관정 group study room. Absent from other Plans.
  study?: PlanStudy;
}

export interface MenuDish {
  name: string;
  price: number | null;
  // Its kind of food, for the chips of kinds: null for another cuisine, a side dish, rice, a drink and the like, and for a
  // name the main server has not read yet; absent from a main server before P05 ticket 15.
  cuisine?: Cuisine | null;
}

export type Cuisine = '한식' | '중식' | '일식' | '양식' | '분식';

// What the map draws, by meaning. The app decides colours, camera, and label sides.
export interface MapScene {
  people: {
    userId: string;
    name: string;
    me: boolean;
    // At 'building', the point of the Place the person is in.
    at: LatLng;
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
    from: LatLng;
    to: LatLng;
    minutes: number;
    mode?: 'walk' | 'shuttle';
  }[];
  // `placeId`: the Place an `away` flag points to.
  flags: { at: LatLng; text: string; role: FlagRole; placeId?: string }[];
}

// The Assistant's reply, whole: its text, the buttons under it that show a layer of the map, each layer once, its
// cards in the order shown, the Proposal it made, or null, and the answer or the Lookup it drew on the map, or null. A
// main server before P01-01 leaves the answer out, and one before P01-06 the Lookup.
export interface AssistantReply extends WithRefusal {
  text: string;
  mapButtons: MapLayer[];
  cards: ChatCard[];
  proposal: QuestProposal | null;
  answer?: AnswerReply | null;
  lookup?: Lookup | null;
  // Buttons under the text of a reply that draws nothing, such as a Tutorial quest's 가는 길 보기 (P01-14).
  offers?: ReplyOffer[];
  // Each request of a message that asked for two or more, in time order (P03). A server before P03 leaves it out.
  steps?: ReplyStep[];
  // The plan the User chose in words (P05 ticket 51): of the meal answer on screen, kept with its list and numbers, or
  // of the reply's own answer, which then opens at it. `key`: the request whose answer holds it, to an app that says
  // `answers`.
  select?: { planId: string; key?: string };
  // To an app that says `answers` (P03 ticket 20): the answers the reply draws or changes, one per request, each with its
  // `key`; an answer on screen it does not name stays. `withdrawn`: the keys of the requests that ended with none, whose
  // answers leave. A main server before P05 ticket 73 leaves both out, and so does one the app does not tell `answers`.
  answers?: AnswerReply[];
  withdrawn?: string[];
  // The answer on screen leaves the map, with its time card and button: the User asked for another plan, or something
  // else, and nothing could be drawn for it (P05 ticket 55). A server before it leaves it out.
  clears?: true;
  // The conversation's Classes left out (P01 ticket 40), which the next requests send. A server before it leaves it out.
  skipped?: LeftOutClass[];
}

export type { AskOffer, ReplyOffer } from './reply-offer-types';

export type { BandRules, TimeBand } from './time-band-types';
export type { LeftOutClass } from './left-out-types';
