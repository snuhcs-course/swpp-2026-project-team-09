/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useRef, useState } from 'react';
import type { Bubbles, Chat, ChatBubble } from './use-chat';

// A conversation the User left for another, kept while the app runs (P04 ticket 10). Its id is its first bubble's, which
// is never given again.
export interface EarlierConversation {
  id: number;
  bubbles: readonly ChatBubble[];
}

// The conversations kept beside the current one: "새 대화" moves the current one among them, and a press on one of
// their questions takes it up again in place of the current one, which is kept in its turn. Nothing is erased; a
// conversation that holds nothing is not kept. Leaving drops a question still on its way (`leave`).
export function useConversations(
  show: Bubbles['show'],
  leave: () => readonly ChatBubble[],
): Pick<Chat, 'earlier' | 'startNew' | 'resume'> {
  const [earlier, setEarlier] = useState<readonly EarlierConversation[]>([]);
  const keptNow = useRef<readonly EarlierConversation[]>([]);
  const keep = useCallback((next: readonly EarlierConversation[]): void => {
    keptNow.current = next;
    setEarlier(next);
  }, []);
  const putAside = useCallback(
    (others: readonly EarlierConversation[]): void => {
      const left = leave();
      const [first] = left;
      keep(first === undefined ? others : [{ id: first.id, bubbles: left }, ...others]);
    },
    [keep, leave],
  );
  const startNew = useCallback((): void => {
    putAside(keptNow.current);
  }, [putAside]);
  const resume = useCallback(
    (id: number): void => {
      const taken = keptNow.current.find((kept) => kept.id === id);
      if (taken === undefined) {
        return;
      }
      putAside(keptNow.current.filter((kept) => kept !== taken));
      show(taken.bubbles);
    },
    [putAside, show],
  );
  return { earlier, startNew, resume };
}
