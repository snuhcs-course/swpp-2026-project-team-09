/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import { leftOutOf, withPutBack } from './left-out';
import type { Chat, ChatBubble } from './use-chat';

// The conversation's Classes left out, read when a request is sent, and one put back by a time card's ✕ at once, so
// that the recalculation it asks sends the list without it (P01 ticket 40).
export function useLeftOut(
  said: { readonly current: readonly ChatBubble[] },
  show: (next: readonly ChatBubble[]) => void,
): Pick<Chat, 'leftOut' | 'putBack'> {
  const leftOut = useCallback(() => leftOutOf(said.current), [said]);
  const putBack = useCallback(
    (classId: string): void => {
      show(withPutBack(said.current, classId));
    },
    [said, show],
  );
  return { leftOut, putBack };
}
