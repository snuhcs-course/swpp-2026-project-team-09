/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { RecruitingQuest } from './party-types';
import type { Board, GlobalEvent } from './types';

// --- The Assistant (POST /assistant/messages) ---

// A card the Assistant showed, by what it is and its id. The server is sent only these, never the card's data.
export interface CardReference {
  kind: 'quest' | 'globalEvent';
  id: string;
}

// A Proposal: a 공개 파티 the Assistant filled in from what the User wrote, which does not exist until the User makes
// it with the card's 만들기. An Open Quest is the form's 바로 참여, an Approval one its 승인 후 참여. `startsAt` is in
// Korea time with its offset.
export interface QuestProposal {
  title: string;
  description: string;
  joinPolicy: 'open' | 'approval';
  board: Board;
  capacity: number;
  startsAt: string;
}

// One message of the conversation, as the app sends it: the User's text, or the Assistant's with the cards it showed
// and, on the last that made one, its Proposal by its values.
export type ChatMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; cards: CardReference[]; proposal?: QuestProposal };

// What the main server takes (main-server README: Assistant): the latest 20 messages, a User's of at most 1,000
// characters, and at most 24,000 characters together, a Proposal's title and description included.
export const CHAT_HISTORY_MAX = 20;
export const USER_MESSAGE_MAX = 1000;
export const MESSAGES_TOTAL_MAX = 24_000;

// The layers of the map a reply can show with a button: the restaurants and the shuttle.
export const MAP_LAYERS = ['dining', 'shuttle'] as const;

export type MapLayer = (typeof MAP_LAYERS)[number];

// A card of a reply, in the shape of the list the app draws it from: a Global Event as the 행사 tab lists it, and a
// recruiting Quest as the Boards list it.
export interface GlobalEventCard {
  kind: 'globalEvent';
  globalEvent: GlobalEvent;
}

export interface QuestCard {
  kind: 'quest';
  quest: RecruitingQuest;
}

export type ChatCard = GlobalEventCard | QuestCard;

// The characters a message counts for against MESSAGES_TOTAL_MAX: its text, and its Proposal's title and description.
export function lengthOf(message: ChatMessage): number {
  const proposal = message.role === 'assistant' ? message.proposal : undefined;
  return message.text.length + (proposal === undefined ? 0 : proposal.title.length + proposal.description.length);
}

// What a later request sends of a card: what it is and its id, never its data.
export function referenceOf(card: ChatCard): CardReference {
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
