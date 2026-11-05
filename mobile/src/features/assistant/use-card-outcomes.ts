/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useState } from 'react';
import type { Bubbles, CardOutcome, Chat, OwnBubble } from './use-chat';

// The app's own bubbles, added after what was said.
export function useAddOwn(add: Bubbles['add']): Chat['addOwn'] {
  return useCallback(
    ({ text, cards = [], done }: OwnBubble): void => {
      add({
        role: 'assistant',
        text,
        cards,
        mapButtons: [],
        proposal: null,
        choices: [],
        chosen: null,
        resolvedBy: [],
        nextLine: null,
        failure: null,
        own: true,
        done,
      });
    },
    [add],
  );
}

// How the library cards ended, kept with the conversation.
export function useOutcomes(): Pick<Chat, 'outcomes' | 'finish' | 'unfinish'> & { forget: () => void } {
  const [outcomes, setOutcomes] = useState<ReadonlyMap<string, CardOutcome>>(new Map());
  const finish = useCallback((card: string, outcome: CardOutcome): void => {
    setOutcomes((last) => new Map(last).set(card, outcome));
  }, []);
  const unfinish = useCallback((card: string): void => {
    setOutcomes((last) => {
      const next = new Map(last);
      next.delete(card);
      return next;
    });
  }, []);
  const forget = useCallback((): void => {
    setOutcomes(new Map());
  }, []);
  return { outcomes, finish, unfinish, forget };
}
