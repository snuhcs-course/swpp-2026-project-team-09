/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { GlobalEvent } from './types';

// --- The Assistant (POST /assistant/messages) ---

// A card the Assistant showed, by what it is and its id. The server is sent only these, never the card's data.
export interface CardReference {
  kind: 'quest' | 'globalEvent';
  id: string;
}

// One message of the conversation, as the app sends it: the User's text, or the Assistant's with the cards it showed.
export type ChatMessage = { role: 'user'; text: string } | { role: 'assistant'; text: string; cards: CardReference[] };

// What the main server takes (main-server README: Assistant): the latest 20 messages, a User's of at most 1,000
// characters, and at most 24,000 characters together.
export const CHAT_HISTORY_MAX = 20;
export const USER_MESSAGE_MAX = 1000;
export const MESSAGES_TOTAL_MAX = 24_000;

// The layers of the map a reply can show with a button: the restaurants and the shuttle.
export const MAP_LAYERS = ['dining', 'shuttle'] as const;

export type MapLayer = (typeof MAP_LAYERS)[number];

// A card of a reply, in the shape of the list the app draws it from: a Global Event as the 행사 tab lists it.
export interface GlobalEventCard {
  kind: 'globalEvent';
  globalEvent: GlobalEvent;
}

export type ChatCard = GlobalEventCard;

// What a later request sends of a card: what it is and its id, never its data.
export function referenceOf(card: ChatCard): CardReference {
  return { kind: card.kind, id: card.globalEvent.id };
}

// The Assistant's reply, whole: its text, the buttons under it that show a layer of the map, each layer once, and its
// cards in the order shown.
export interface AssistantReply {
  text: string;
  mapButtons: MapLayer[];
  cards: ChatCard[];
}
