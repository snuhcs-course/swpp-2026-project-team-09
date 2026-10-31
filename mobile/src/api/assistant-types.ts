/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { MenuLine } from './menu-types';
import type { RecruitingQuest } from './party-types';
import type { Board, GlobalEvent, JoinPolicy } from './types';

// --- The Assistant (POST /assistant/messages) ---

// A card the Assistant showed, by what it is and its id, which for a Restaurant is its key. The server is sent only
// these, never the card's data.
export interface CardReference {
  kind: 'quest' | 'globalEvent' | 'restaurant';
  id: string;
}

// A Place or a Friend of a Proposal, by id and the words the card shows: the Place's name, the Friend's name. Never
// where a Friend is.
export interface ProposalPlace {
  id: string;
  name: string;
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

// How one person gets to a Restaurant: `name` is 나 for the User, and a person whose way is unknown has no mode and no
// minutes ("—"). `longest` marks whoever walks furthest.
export interface RestaurantWay {
  name: string;
  mode: 'walk' | 'shuttle' | null;
  minutes: number | null;
  longest: boolean;
}

// A Restaurant of a 공강에 밥 answer: its Place's number, the day and the meal, how long there is to eat, its lines that
// are not notes, each person's way, and the 파티 its 파티 만들기 fills the form with.
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
    people: RestaurantWay[];
    proposal: QuestProposal;
  };
}

export type ChatCard = GlobalEventCard | QuestCard | RestaurantCard;

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
  return { kind: card.kind, id: card.kind === 'quest' ? card.quest.id : card.globalEvent.id };
}

// The Assistant's reply, whole: its text, the buttons under it that show a layer of the map, each layer once, its
// cards in the order shown, and the Proposal it made, or null.
export interface AssistantReply {
  text: string;
  mapButtons: MapLayer[];
  cards: ChatCard[];
  proposal: QuestProposal | null;
}
