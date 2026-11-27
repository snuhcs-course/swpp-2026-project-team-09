/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import type { AnswerReply } from '@/api/assistant-types';
import type { Bubbles, Chat, ChatBubble } from './use-chat';

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
function useAskApp(
  { said, show, add }: Pick<Bubbles, 'said' | 'show' | 'add'>,
  conversation: { readonly current: number },
  setWaiting: (waiting: boolean) => void,
  takeBack: () => void,
): Chat['askApp'] {
  return useCallback(
    async (
      asked: string,
      reply: () => Promise<AnswerReply>,
      fromCard = false,
    ): Promise<'shown' | 'forgotten' | 'failed'> => {
      takeBack();
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
      const marked = fromCard ? { fromCard: true as const } : {};
      add({ role: 'assistant', text, cards: [], mapButtons: [], proposal: null, failure: null, answer, ...marked });
      return 'shown';
    },
    [add, conversation, said, setWaiting, show, takeBack],
  );
}

// The reply and the words asked right before it go; whatever else the conversation holds stays as it is.
function useTakeBackTurn({ said, show }: Pick<Bubbles, 'said' | 'show'>): Chat['takeBackTurn'] {
  return useCallback(
    (replyId: number): void => {
      const at = said.current.findIndex(({ id }) => id === replyId);
      const asked = said.current[at - 1];
      if (at < 1 || asked?.role !== 'user') {
        return;
      }
      show(said.current.toSpliced(at - 1, 2));
    },
    [said, show],
  );
}

export function useAppTurn(
  bubbles: Pick<Bubbles, 'said' | 'show' | 'add'>,
  conversation: { readonly current: number },
  setWaiting: (waiting: boolean) => void,
  takeBack: () => void,
): Pick<Chat, 'askApp' | 'takeBackTurn'> {
  const askApp = useAskApp(bubbles, conversation, setWaiting, takeBack);
  const takeBackTurn = useTakeBackTurn(bubbles);
  return { askApp, takeBackTurn };
}

// The reply of the answer on screen when the app asked it from a card, which taking every Friend out of the answer
// takes back; null for any other answer.
export function fromCardReplyOf(bubbles: readonly ChatBubble[], source: AnswerReply | null): number | null {
  const reply = source === null ? undefined : bubbles.findLast(({ answer }) => answer === source);
  return reply?.fromCard === true ? reply.id : null;
}
