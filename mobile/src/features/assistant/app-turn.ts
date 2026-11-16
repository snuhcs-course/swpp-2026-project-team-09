/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import type { AnswerReply } from '@/api/assistant-types';
import type { Bubbles, Chat } from './use-chat';

// A turn of the conversation the app asks itself and answers without the model, such as a tap on an interest mark of
// the map (P05 ticket 13): see `Chat['askApp']`.

// What the turn sends back in later requests: its answer's first lines, else the words asked, so that no message the
// main server takes is empty.
function answerWords({ plans, noPlan }: AnswerReply, asked: string): string {
  const lines = plans[0]?.lines ?? noPlan?.lines ?? [];
  const words = lines.map((parts) => parts.map(({ text }) => text).join('')).join('\n');
  return words.trim() === '' ? asked : words;
}

// The words stand as the User's while the answer is on its way, which the conversation waits for as for a reply. An
// answer to a conversation forgotten meanwhile is dropped; a failure takes the words back.
export function useAskApp(
  { said, show, add }: Pick<Bubbles, 'said' | 'show' | 'add'>,
  conversation: { readonly current: number },
  setWaiting: (waiting: boolean) => void,
): Chat['askApp'] {
  return useCallback(
    async (asked: string, reply: () => Promise<AnswerReply>): Promise<'shown' | 'forgotten' | 'failed'> => {
      const before = said.current;
      const asking = conversation.current;
      add({ role: 'user', text: asked, cards: [], mapButtons: [], proposal: null, failure: null });
      setWaiting(true);
      const answer = await reply().catch(() => null);
      if (asking !== conversation.current) {
        return 'forgotten';
      }
      setWaiting(false);
      if (answer === null) {
        show(before);
        return 'failed';
      }
      const text = answerWords(answer, asked);
      add({ role: 'assistant', text, cards: [], mapButtons: [], proposal: null, failure: null, answer });
      return 'shown';
    },
    [add, conversation, said, setWaiting, show],
  );
}
