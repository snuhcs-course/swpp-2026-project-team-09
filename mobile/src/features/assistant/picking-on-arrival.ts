/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import type { ChatBubble } from './use-chat';
import { pickingOpened, type PickingState } from './use-people-picking';

// The highest id of the conversation's bubbles. Ids are never given again, so a reply above every id seen before has
// just arrived, and one taken up again from an earlier conversation lies below.
export function newestOf(bubbles: readonly ChatBubble[]): number {
  return Math.max(0, ...bubbles.map(({ id }) => id));
}

// A new reply's state, which keeps the highest id seen, with the picking of Friends open on its Plan when the reply has
// just arrived (its id above `seen`) and its answer asks for it, as if "＋ 같이" were pressed (P04 ticket 73). An answer
// restored or taken up again opens nothing by itself.
export function openedIfArrived<S extends PickingState & { source: AnswerReply | null; newest: number }>(
  fresh: S,
  { replyId, seen, bubbles }: { replyId: number | undefined; seen: number; bubbles: readonly ChatBubble[] },
): S {
  const next = { ...fresh, newest: Math.max(seen, newestOf(bubbles)) };
  return replyId !== undefined && replyId > seen && next.source?.pickPeople === true ? pickingOpened(next) : next;
}
