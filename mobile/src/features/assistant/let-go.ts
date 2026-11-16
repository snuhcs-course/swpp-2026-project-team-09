/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import type { Bubbles, Chat } from './use-chat';

// What lets the conversation go, 새 대화, or only its question on its way, 그만. Each counts the conversation as
// another, so that a reply on its way for the one before is dropped when it comes.
export function useLetGo(
  { said, show }: Pick<Bubbles, 'said' | 'show'>,
  conversation: { current: number },
  setWaiting: (waiting: boolean) => void,
  forgetCards: () => void,
): Pick<Chat, 'reset' | 'stop'> {
  const reset = useCallback((): void => {
    conversation.current += 1;
    show([]);
    forgetCards();
    setWaiting(false);
  }, [conversation, forgetCards, setWaiting, show]);
  const stop = useCallback((): void => {
    conversation.current += 1;
    const asked = said.current.findLastIndex(({ role }) => role === 'user');
    show(asked < 0 ? said.current : said.current.slice(0, asked));
    setWaiting(false);
  }, [conversation, said, setWaiting, show]);
  return { reset, stop };
}
