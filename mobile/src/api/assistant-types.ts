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
 ******************************************************************************/

import type { LibraryCard } from './library-card-types';
import type { Lookup } from './lookup-types';
import type { MenuLine } from './menu-types';
import type { RecruitingQuest } from './party-types';
import type { WithRefusal } from './refusal-types';
import type { NewQuestInput, QuestsInput } from './recruiting-plan-types';
import type { FlagRole, PlaceRole, RouteRole } from './scene-roles';
import type { Board, GlobalEvent, JoinPolicy, LatLng } from './types';

// --- The Assistant (POST /assistant/messages) ---

// A card the Assistant showed, by what it is and its id, which for a Restaurant and a library card is its key. The
// server is sent only these, never the card's data.
export interface CardReference {
  kind: 'quest' | 'globalEvent' | 'restaurant' | 'library';
  id: string;
}

// What the app tells the main server it can draw, with every chat request: library cards. An app without it (the
// 1.0.0 bundle) is never sent one. A request with a context also says it draws an answer on the map.
export const CLIENT_CAPABILITIES = ['library'] as const;
export const ANSWER_CAPABILITIES = [...CLIENT_CAPABILITIES, 'answer'] as const;

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
}

// A Proposal as it is sent back: its Global Event by id and title, as a card goes back by reference.
export type SentProposal = Omit<QuestProposal, 'globalEvent'> & { globalEvent: { id: string; title: string } | null };

export function sentProposalOf(proposal: QuestProposal): SentProposal {
  const { globalEvent } = proposal;
  return { ...proposal, globalEvent: globalEvent === null ? null : { id: globalEvent.id, title: globalEvent.title } };
}

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
export interface RequestContext {
  location: LatLng | null;
  // The visible map area.
  viewport: { south: number; west: number; north: number; east: number } | null;
  tapped: { kind: 'place'; placeId: string } | { kind: 'friend'; userId: string } | null;
  // The condition chips of the answer on screen.
  conditions: PlanInput | null;
  // The plan on screen.
  planId: string | null;
}

// The conditions of a plan: what a recalculation needs, and nothing the server can read itself.
export type PlanInput = MealInput | EventsInput | QuestsInput | NewQuestInput;

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
  quest?: RecruitingQuest;
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
  places: { place: PlacePoint; role: PlaceRole; tag: string | null }[];
  // `mode` is absent for a walk.
  routes: {
    userId: string;
    role: RouteRole;
    from: LatLng;
    to: LatLng;
    minutes: number;
    mode?: 'walk' | 'shuttle';
  }[];
  flags: { at: LatLng; text: string; role: FlagRole }[];
}

export interface TimeBand {
  range: { startAt: string; endAt: string };
  now: string;
  lanes: { userId: string; name: string; busy: { startAt: string; endAt: string }[] }[];
  startAt: string;
  endAt: string;
  text: string;
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
}
