/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createContext, use } from 'react';
import type { ChatBubble } from '@/features/assistant/use-chat';

// The answer card's one sentence slot (P01 ticket 20, the user's rule of 2026-11-27): the card is, top to bottom, one
// sentence → the ticket, when there is one → the main button beside the input. The slot holds one thing, by priority:
// (1) the app's own line made by a button, (2) the model's latest reply, (3) the app's explaining line. Earlier replies
// do not pile up, and the waiting dots stand in the slot. Every answer kind goes through this one path.

// Whether the slot holds a reply or the waiting dots, over a card kept from an earlier turn: the card's own explaining
// line, the lowest, then gives way.
export const SlotHeld = createContext(false);

export function useSlotHeld(): boolean {
  return use(SlotHeld);
}

// Whether a reply's words are its card: an answer or a Lookup draws its own card through them.
function wordsAreItsCard({ answer, lookup }: ChatBubble): boolean {
  return (answer ?? null) !== null || (lookup ?? null) !== null;
}

// Whether a bubble holds the turn's slot: the latest one only, since a later reply, or the app's own line after a
// button, takes it from an earlier one.
export function holdsSlot(bubble: ChatBubble, after: readonly ChatBubble[]): boolean {
  return bubble === after.at(-1);
}

// Which bubbles of a turn draw their words: the one holding the slot, and a reply whose words are its card, which
// keeps the card; under a later bubble its sentence and its explaining line give way (`SlotHeld`), as a seat booked
// from the steps of a seat and a meal gives the slot to its ticket (P10 ticket 29).
export function drawsWords(bubble: ChatBubble, after: readonly ChatBubble[]): boolean {
  return holdsSlot(bubble, after) || wordsAreItsCard(bubble);
}
