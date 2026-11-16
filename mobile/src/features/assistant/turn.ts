/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ChatBubble } from './use-chat';

// A turn of the conversation: what the User asked last, and everything after it, the Assistant's reply, a failure,
// and the app's own bubbles. Before the User says anything, the app's own bubbles are a turn whose words are the
// first one's.
export interface Turn {
  asked: string;
  after: readonly ChatBubble[];
}

export function turnOf(bubbles: readonly ChatBubble[]): Turn | null {
  const last = bubbles.findLastIndex(({ role }) => role === 'user');
  const asked = bubbles[last];
  if (asked !== undefined) {
    return { asked: asked.text, after: bubbles.slice(last + 1) };
  }
  const [first] = bubbles;
  return first === undefined ? null : { asked: first.text, after: bubbles };
}
