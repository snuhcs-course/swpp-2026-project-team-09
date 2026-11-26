/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef } from 'react';
import type { ChatBubble } from './use-chat';
import { lastReply, type ShownAnswer } from './use-shown-answer';

// A plan of the meal answer on screen chosen in words ("2번으로 할게", P05 ticket 51): the reply draws nothing of its
// own, so the answer, its list and its numbers stay, and the plan it chose is shown, once for that reply. A plan the
// answer on screen does not have leaves it as it is.
export function useSpokenChoice(
  bubbles: readonly ChatBubble[],
  { answer, show }: Pick<ShownAnswer, 'answer' | 'show'>,
): void {
  const done = useRef<number | null>(null);
  const reply = lastReply(bubbles);
  const replyId = reply?.id ?? null;
  // A reply with an answer of its own opens it at the plan chosen (`fresh` in answer-state.ts).
  const planId = (reply?.answer ?? null) === null ? reply?.select : undefined;
  const listed = answer?.plans.some(({ id }) => id === planId) === true;
  useEffect(() => {
    if (replyId === null || planId === undefined || done.current === replyId || !listed) {
      return;
    }
    done.current = replyId;
    show(planId);
  }, [replyId, planId, listed, show]);
}
