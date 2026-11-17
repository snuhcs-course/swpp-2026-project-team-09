/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ChatBubble } from './use-chat';

// A turn of the conversation: what the User asked last, and everything after it, the Assistant's reply, a failure,
// and the app's own bubbles. Before the User says anything, the app's own bubbles are a turn whose words are the
// first one's. `id` is the id of the turn's first bubble.
export interface Turn {
  id: number;
  asked: string;
  after: readonly ChatBubble[];
}

export function turnOf(bubbles: readonly ChatBubble[]): Turn | null {
  const last = bubbles.findLastIndex(({ role }) => role === 'user');
  const asked = bubbles[last];
  if (asked !== undefined) {
    return { id: asked.id, asked: asked.text, after: bubbles.slice(last + 1) };
  }
  const [first] = bubbles;
  return first === undefined ? null : { id: first.id, asked: first.text, after: bubbles };
}

// Every turn of the conversation, the first first, as `turnOf` counts the last.
export function turnsOf(bubbles: readonly ChatBubble[]): Turn[] {
  const turns: { id: number; asked: string; after: ChatBubble[] }[] = [];
  for (const bubble of bubbles) {
    const last = turns.at(-1);
    if (bubble.role === 'user') {
      turns.push({ id: bubble.id, asked: bubble.text, after: [] });
    } else if (last === undefined) {
      turns.push({ id: bubble.id, asked: bubble.text, after: [bubble] });
    } else {
      last.after.push(bubble);
    }
  }
  return turns;
}
