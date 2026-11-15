/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { turnOf } from './turn';
import type { ChatBubble } from './use-chat';

// The words of the User's message that a failure the Assistant may get over answered, to put back in the input, and
// that failure's bubble, by which the input tells one failure from the next.
export interface Restore {
  id: number;
  words: string;
}

// While such a failure is the last thing said; null otherwise.
export function restoreOf(bubbles: readonly ChatBubble[]): Restore | null {
  const last = bubbles.at(-1);
  const turn = turnOf(bubbles);
  return last?.failure === 'unavailable' && turn !== null ? { id: last.id, words: turn.asked } : null;
}
