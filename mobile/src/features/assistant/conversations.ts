/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useRef, useState } from 'react';
import type { Bubbles, Chat, ChatBubble } from './use-chat';

type Kept = Pick<Chat, 'earlier' | 'startNew' | 'resume' | 'sendNew' | 'clearEarlier'>;

// A conversation the User left for another, kept while the app runs (P04 ticket 10). Its id is its first bubble's, which
// is never given again.
export interface EarlierConversation {
  id: number;
  bubbles: readonly ChatBubble[];
}

// The conversations kept beside the current one: "새 대화" moves the current one among them, and a press on one of
// their questions takes it up again in place of the current one, which is kept in its turn. "모두 지우기" erases the
// kept ones and never the current one (`clearEarlier`, P04 ticket 49); a conversation that holds nothing is not kept. Leaving drops a question still on its way (`leave`). A message from the
// main map starts a new one with it (`sendNew`, P04 ticket 33).
export function useConversations(show: Bubbles['show'], leave: () => readonly ChatBubble[], send: Chat['send']): Kept {
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
  const sendNew = useCallback(
    (...[text, tapped, mentions]: Parameters<Chat['send']>): void => {
      startNew();
      send(text, tapped, mentions);
    },
    [send, startNew],
  );
  const clearEarlier = useCallback((): void => {
    keep([]);
  }, [keep]);
  return { earlier, startNew, resume, sendNew, clearEarlier };
}
