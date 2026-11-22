/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { turnsOf } from './turn';
import type { ChatBubble } from './use-chat';

// Whether a reply draws a scene of its own on the map: an answer, a Lookup, cards, a Proposal, several requests' steps,
// or a map button. A reply of words alone, a refusal, or a failure draws none.
function drawsItsOwn(bubble: ChatBubble): boolean {
  return (
    (bubble.answer ?? null) !== null ||
    (bubble.lookup ?? null) !== null ||
    bubble.cards.length > 0 ||
    bubble.proposal !== null ||
    bubble.steps !== undefined ||
    bubble.mapButtons.length > 0
  );
}

// The bubbles the map's scene is drawn from (P04 ticket 46): all of them, unless the latest turns draw nothing of their
// own (words alone, or a reply still on its way); then up to the latest turn that does, so that its scene, its bar, its
// marks, its chosen place, and its main button stay while the card says the new words. With no turn that draws a scene,
// all of them.
export function sceneBubblesOf(bubbles: readonly ChatBubble[]): readonly ChatBubble[] {
  const turns = turnsOf(bubbles);
  const drawn = turns.findLastIndex(({ after }) => after.some((reply) => drawsItsOwn(reply)));
  const next = turns[drawn + 1];
  if (drawn < 0 || next === undefined) {
    return bubbles;
  }
  return bubbles.slice(
    0,
    bubbles.findIndex(({ id }) => id === next.id),
  );
}
