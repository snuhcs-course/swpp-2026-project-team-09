/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useCallback } from 'react';
import type { Bubbles, Chat, OwnBubble } from './use-chat';

// `askOwn` of the chat (A04 ticket 11): a new conversation whose first turn the app gives itself, its words as the
// User's and its own bubble as the reply. Both are `own`, so neither is ever sent and no model is called.
export function useAskOwn(add: Bubbles['add'], startNew: () => void): Chat['askOwn'] {
  return useCallback(
    (asked: string, { text, cards = [], done }: OwnBubble): void => {
      const parts = { mapButtons: [], proposal: null, failure: null, own: true };
      startNew();
      add({ role: 'user', text: asked, cards: [], ...parts });
      add({ role: 'assistant', text, cards, done, ...parts });
    },
    [add, startNew],
  );
}
