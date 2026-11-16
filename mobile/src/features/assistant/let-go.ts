/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useRef, useState } from 'react';
import type { Bubbles, Chat } from './use-chat';

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

// What lets the conversation go, 새 대화, or only its question on its way, 그만. Each counts the conversation as
// another, so that a reply on its way for the one before is dropped when it comes. 새 대화 gives the call that brings
// the conversation back, without a question that was still on its way, as long as nothing was said since. The library
// cards' outcomes and rooms are kept by their bubbles' ids, which are never given again, so they stay for it. `takeBack` is 그만 before a new turn
// is asked while a reply is on its way: with the frame hidden the User cannot see that one waits, and the late reply
// would answer the new turn.
export function useLetGo(
  { said, show }: Pick<Bubbles, 'said' | 'show'>,
  conversation: { current: number },
  { setWaiting, waitingNow }: Pick<Waiting, 'setWaiting' | 'waitingNow'>,
): Pick<Chat, 'reset' | 'stop'> & { takeBack: () => void } {
  const reset = useCallback((): (() => void) => {
    const asked = said.current.findLastIndex(({ role }) => role === 'user');
    const kept = waitingNow.current && asked >= 0 ? said.current.slice(0, asked) : said.current;
    conversation.current += 1;
    const forgotten = conversation.current;
    show([]);
    setWaiting(false);
    return () => {
      if (conversation.current === forgotten && said.current.length === 0) {
        conversation.current += 1;
        show(kept);
      }
    };
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
  return { reset, stop, takeBack };
}
