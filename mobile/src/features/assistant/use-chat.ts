/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useCallback, useRef, useState } from 'react';
import {
  CHAT_HISTORY_MAX,
  type ChatMessage,
  lengthOf,
  type MapLayer,
  MESSAGES_TOTAL_MAX,
  type QuestProposal,
  referenceOf,
} from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { ShownChatCard } from '@/api/quest-parts-types';

// Why the Assistant gave no answer: it could not answer now, which 다시 시도 sends again, or the User's messages of
// the day are used up.
export type ChatFailure = 'unavailable' | 'usedUp';

// One bubble of the chat. A failure is shown as the Assistant's, and never sent back to it.
export interface ChatBubble {
  id: number;
  role: ChatMessage['role'];
  text: string;
  // The cards an Assistant's answer showed, with the data the server filled them with and a Quest's parts. Only their
  // references are sent back.
  cards: readonly ShownChatCard[];
  // The buttons under an Assistant's answer that show a layer of the map. They are not sent back.
  mapButtons: readonly MapLayer[];
  // The Proposal an Assistant's answer made. The last one is sent back with its values.
  proposal: QuestProposal | null;
  failure: ChatFailure | null;
}

export interface Chat {
  bubbles: readonly ChatBubble[];
  // While the Assistant works on the User's last message: the "···" bubble, and nothing more is sent.
  waiting: boolean;
  send: (text: string) => void;
  // Sends the User's last message again, after a failure the Assistant may get over.
  retry: () => void;
  // 새 대화: forgets the conversation, and a reply still on its way.
  reset: () => void;
}

export const CHAT_FAILED = '지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요';
export const CHAT_USED_UP = '오늘은 여기까지 답할 수 있어요. 내일 다시 물어봐 주세요';

const FAILURE_TEXT: Record<ChatFailure, string> = { unavailable: CHAT_FAILED, usedUp: CHAT_USED_UP };

function textLength(messages: readonly ChatMessage[]): number {
  return messages.reduce((total, message) => total + lengthOf(message), 0);
}

// What a request sends of the conversation: the latest 20 messages without the failures, fewer while they hold more
// characters than the main server takes. The last Proposal goes with its message, by its values, so that the
// Assistant can change one of its fields and keep the others.
export function messagesToSend(bubbles: readonly ChatBubble[]): ChatMessage[] {
  const said = bubbles.filter(({ failure }) => failure === null);
  const proposing = said.findLast(({ proposal }) => proposal !== null);
  let messages = said
    .map((bubble): ChatMessage => {
      const { role, text, cards, proposal } = bubble;
      if (role === 'user') {
        return { role, text };
      }
      const references = cards.map((card) => referenceOf(card));
      return bubble === proposing && proposal !== null
        ? { role, text, cards: references, proposal }
        : { role, text, cards: references };
    })
    .slice(-CHAT_HISTORY_MAX);
  while (messages.length > 1 && textLength(messages) > MESSAGES_TOTAL_MAX) {
    messages = messages.slice(1);
  }
  return messages;
}

type NewBubble = Omit<ChatBubble, 'id'>;

// The Assistant's bubble for the conversation: its reply, or the failure.
async function answerTo(messages: ChatMessage[]): Promise<NewBubble> {
  try {
    const reply = await apiClient.askAssistant(messages);
    const { text, cards, mapButtons, proposal } = reply;
    return { role: 'assistant', text, cards, mapButtons, proposal, failure: null };
  } catch (error) {
    const failure = error instanceof ApiError && error.status === 429 ? 'usedUp' : 'unavailable';
    return { role: 'assistant', text: FAILURE_TEXT[failure], cards: [], mapButtons: [], proposal: null, failure };
  }
}

interface Bubbles {
  bubbles: readonly ChatBubble[];
  // What was said, as the next request sends it, without waiting for a render.
  said: { readonly current: readonly ChatBubble[] };
  show: (next: readonly ChatBubble[]) => void;
  add: (bubble: NewBubble) => void;
}

function useBubbles(): Bubbles {
  const [bubbles, setBubbles] = useState<readonly ChatBubble[]>([]);
  const said = useRef<readonly ChatBubble[]>([]);
  const nextId = useRef(0);
  const show = useCallback((next: readonly ChatBubble[]): void => {
    said.current = next;
    setBubbles(next);
  }, []);
  const add = useCallback(
    (bubble: NewBubble): void => {
      nextId.current += 1;
      show([...said.current, { ...bubble, id: nextId.current }]);
    },
    [show],
  );
  return { bubbles, said, show, add };
}

// The conversation with the Assistant, kept in memory by whoever holds the hook; the server keeps none of it. Each
// message sends the conversation, and the reply is shown whole.
export function useChat(): Chat {
  const { bubbles, said, show, add } = useBubbles();
  const [waiting, setWaiting] = useState(false);
  // Which conversation a reply belongs to: 새 대화 starts another, and a reply to the one before is dropped.
  const conversation = useRef(0);

  // Asks the Assistant to answer the conversation as it stands, the User's message last.
  const ask = useCallback((): void => {
    const asked = conversation.current;
    setWaiting(true);
    void answerTo(messagesToSend(said.current)).then((answer) => {
      if (asked === conversation.current) {
        add(answer);
        setWaiting(false);
      }
    });
  }, [add, said]);

  const send = useCallback(
    (text: string): void => {
      add({ role: 'user', text, cards: [], mapButtons: [], proposal: null, failure: null });
      ask();
    },
    [add, ask],
  );

  const retry = useCallback((): void => {
    if (said.current.at(-1)?.failure !== 'unavailable') {
      return;
    }
    show(said.current.slice(0, -1));
    ask();
  }, [ask, said, show]);

  const reset = useCallback((): void => {
    conversation.current += 1;
    show([]);
    setWaiting(false);
  }, [show]);

  return { bubbles, waiting, send, retry, reset };
}
