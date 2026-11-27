/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect, useRef } from 'react';
import type { ChatBubble } from './use-chat';
import { lastReply, type ShownAnswer } from './use-shown-answer';

// A plan of the meal answer chosen in words ("2번으로 할게", P05 tickets 51 and 56): it ends as a press on that row of
// the list does, its Restaurant opened in the answer with its menu, the map's pick on it, and the card raised
// (`openMenu`, as `useMenuRaising` gives it), once for that reply. The answer on screen stays with its list and its
// numbers, or the reply's own new answer opens there (a dish asked, a Friend added with the choice). A plan the answer
// does not have leaves it as it is.
export function useSpokenChoice(
  bubbles: readonly ChatBubble[],
  { answer, openMenu }: Pick<ShownAnswer, 'answer' | 'openMenu'>,
): void {
  const done = useRef<number | null>(null);
  const reply = lastReply(bubbles);
  const replyId = reply?.id ?? null;
  const planId = reply?.select;
  const listed = answer?.plans.some(({ id }) => id === planId) === true;
  useEffect(() => {
    if (replyId === null || planId === undefined || done.current === replyId || !listed) {
      return;
    }
    done.current = replyId;
    openMenu(planId);
  }, [replyId, planId, listed, openMenu]);
}
