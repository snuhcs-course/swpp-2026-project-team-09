/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ChatBubble } from '@/features/assistant/use-chat';

// The pill's icon: a person for a meet a button asked (a Friend's card, a Friend Lookup), and the speech bubble for
// words and for the turn of any other button, such as a building's "여기서 먹기".
export function pillIconOf(bubbles: readonly ChatBubble[]): 'chat' | 'user' {
  const at = bubbles.findLastIndex(({ role }) => role === 'user');
  const asked = bubbles[at];
  const reply = bubbles[at + 1];
  return asked?.recalculated === true && reply?.answer?.input.kind === 'meet' ? 'user' : 'chat';
}
