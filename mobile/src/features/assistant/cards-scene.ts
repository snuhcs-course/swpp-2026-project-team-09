/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ChatCard, GlobalEventCard, RestaurantCard } from '@/api/assistant-types';
import type { LatLng, Place } from '@/api/types';
import { koreaClock, koreaDayWord } from '@/korea-time';
import type { Draft } from './answer-groups';
import { turnOf } from './turn';
import type { ChatBubble } from './use-chat';

export const CARD_ID = 'answer:card:';

// One card of the reply on the map (P04 ticket 08): a restaurant at its Place, or an event at its own point, with the
// words its flag says.
export interface MarkedCard {
  number: number;
  card: RestaurantCard | GlobalEventCard;
  position: LatLng;
  title: string;
  line: string | null;
}

export interface ShownCards {
  bubbleId: number;
  cards: readonly MarkedCard[];
}

const MEAL_WORDS = { lunch: '점심', dinner: '저녁' } as const;

// "11:30–13:30 점심", or "점심" without the meal's hours.
export function mealLine({ restaurant: { meal, hours = null } }: RestaurantCard): string {
  return hours === null ? MEAL_WORDS[meal] : `${hours.opensAt}–${hours.closesAt} ${MEAL_WORDS[meal]}`;
}

// "19:30–21:00 오늘(토)": the event's own start and end with its day word, never the User's arrival.
export function eventLine({ globalEvent: { startsAt, endsAt } }: GlobalEventCard, now: Date): string {
  const time = endsAt === null ? koreaClock(startsAt) : `${koreaClock(startsAt)}–${koreaClock(endsAt)}`;
  const day = koreaDayWord(startsAt, now);
  return day === '' ? time : `${time} ${day}`;
}

function marked(card: ChatCard, places: readonly Place[], now: Date): Omit<MarkedCard, 'number'> | null {
  if (card.kind === 'restaurant') {
    const place = places.find(({ number }) => number === card.restaurant.placeNumber);
    return place === undefined
      ? null
      : {
          card,
          position: { latitude: place.latitude, longitude: place.longitude },
          title: card.restaurant.name,
          line: mealLine(card),
        };
  }
  if (card.kind === 'globalEvent') {
    const { latitude, longitude, title } = card.globalEvent;
    return { card, position: { latitude, longitude }, title, line: eventLine(card, now) };
  }
  return null;
}

// The restaurant or event cards the turn on screen replied with alone, those with a point, numbered in their order.
// A reply with a Plan, a Lookup, several requests, or a Proposal keeps its own drawing.
export function shownCardsOf(bubbles: readonly ChatBubble[], places: readonly Place[], now: Date): ShownCards | null {
  const after = turnOf(bubbles)?.after ?? [];
  const [reply] = after;
  if (after.length !== 1 || reply === undefined || reply.role !== 'assistant' || reply.cards.length === 0) {
    return null;
  }
  const { answer = null, lookup = null, steps, proposal } = reply;
  if (answer !== null || lookup !== null || steps !== undefined || proposal !== null) {
    return null;
  }
  const cards: MarkedCard[] = [];
  for (const card of reply.cards) {
    const one = marked(card, places, now);
    if (one !== null) {
      cards.push({ ...one, number: cards.length + 1 });
    }
  }
  return cards.length === 0 ? null : { bubbleId: reply.id, cards };
}

// The number of the card a mark of the map is, from 1; null for any other mark.
export function cardNumberOf(id: string): number | null {
  return id.startsWith(CARD_ID) ? Number(id.slice(CARD_ID.length)) : null;
}

// The first card as the main flag, the others as numbered flags (board 15), each with "›": a press opens its card.
export function cardDrafts({ cards }: ShownCards): Draft[] {
  return cards.map(({ number, position, title, line }) => {
    const first = number === 1;
    return {
      id: `${CARD_ID}${String(number)}`,
      name: first ? `${title} › · ${line ?? ''}` : `${String(number)} ${title} › · ${line ?? ''}`,
      position,
      planId: null,
      group: first ? 'pick' : 'candidate',
      symbol: { type: 'dot', role: first ? 'pick' : 'candidate', number: first ? null : number },
      tone: first ? 'pick' : 'candidate',
      title: `${title} ›`,
      line,
      number: first ? null : number,
    };
  });
}
