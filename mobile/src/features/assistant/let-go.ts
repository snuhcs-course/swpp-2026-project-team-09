/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useRef, useState } from 'react';
import type { Bubbles, Chat, ChatBubble } from './use-chat';

export interface Waiting {
  waiting: boolean;
  setWaiting: (waiting: boolean) => void;
  // The same, at once, for what is asked next.
  waitingNow: { readonly current: boolean };
}

// Whether a reply is on its way.
export function useWaiting(): Waiting {
  const [waiting, setState] = useState(false);
  const waitingNow = useRef(false);
  const setWaiting = useCallback((next: boolean): void => {
    waitingNow.current = next;
    setState(next);
  }, []);
  return { waiting, setWaiting, waitingNow };
}

// What lets the conversation go, 새 대화 or another conversation taken up again (`leave`), or only its question on its
// way, 그만. Each counts the conversation as another, so that a reply on its way for the one before is dropped when it
// comes. `leave` gives what is kept of the conversation left: every turn but a question still on its way. `takeBack` is
// 그만 before a new turn is asked while a reply is on its way: with the frame hidden the User cannot see that one waits,
// and the late reply would answer the new turn.
export function useLetGo(
  { said, show }: Pick<Bubbles, 'said' | 'show'>,
  conversation: { current: number },
  { setWaiting, waitingNow }: Pick<Waiting, 'setWaiting' | 'waitingNow'>,
): Pick<Chat, 'stop'> & { leave: () => readonly ChatBubble[]; takeBack: () => void } {
  const leave = useCallback((): readonly ChatBubble[] => {
    const asked = said.current.findLastIndex(({ role }) => role === 'user');
    const kept = waitingNow.current && asked >= 0 ? said.current.slice(0, asked) : said.current;
    conversation.current += 1;
    show([]);
    setWaiting(false);
    return kept;
  }, [conversation, said, setWaiting, show, waitingNow]);
  const stop = useCallback((): void => {
    conversation.current += 1;
    const asked = said.current.findLastIndex(({ role }) => role === 'user');
    show(asked < 0 ? said.current : said.current.slice(0, asked));
    setWaiting(false);
  }, [conversation, said, setWaiting, show]);
  const takeBack = useCallback((): void => {
    if (waitingNow.current) {
      stop();
    }
  }, [stop, waitingNow]);
  return { leave, stop, takeBack };
}
