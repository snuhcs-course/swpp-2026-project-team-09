/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { useCallback, useRef, useState } from 'react';
import {
  CHAT_HISTORY_MAX,
  type ChatMessage,
  type Choice,
  type Chosen,
  lengthOf,
  type MapLayer,
  MESSAGES_TOTAL_MAX,
  type QuestProposal,
  referenceOf,
  type ResolvedBy,
  sentProposalOf,
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
  // The candidates an Assistant's answer asks the User to choose among, as chips while it is the last bubble.
  choices: readonly Choice[];
  // The candidate a User's message chose with a chip, sent with that message.
  chosen: Chosen | null;
  // The words an Assistant's answer read through an alias, each shown with 아니에요 until the User presses it.
  resolvedBy: readonly ResolvedBy[];
  failure: ChatFailure | null;
}

export interface Chat {
  bubbles: readonly ChatBubble[];
  // While the Assistant works on the User's last message: the "···" bubble, and nothing more is sent.
  waiting: boolean;
  send: (text: string) => void;
  // A chip pressed: sends its label as the User's message, with the candidate it chose.
  choose: (choice: Choice) => void;
  // Sends the User's last message again, after a failure the Assistant may get over.
  retry: () => void;
  // 아니에요 under an answer: tells the main server those words did not mean that, and then takes the line away.
  // Throws when the main server did not take it.
  rejectAlias: (bubbleId: number, reading: ResolvedBy) => Promise<void>;
  // 새 대화: forgets the conversation, and a reply still on its way.
  reset: () => void;
  // Shows a Proposal that no request asked for, a suggestion's, as the Assistant's, and gives its bubble's id. Nothing
  // is sent now; the bubble goes with the next request as any other.
  propose: (text: string, proposal: QuestProposal) => number;
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
      const { role, text, cards, proposal, chosen } = bubble;
      if (role === 'user') {
        return chosen === null ? { role, text } : { role, text, chosen };
      }
      const references = cards.map((card) => referenceOf(card));
      return bubble === proposing && proposal !== null
        ? { role, text, cards: references, proposal: sentProposalOf(proposal) }
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
    const { text, cards, mapButtons, proposal, choices, resolvedBy } = reply;
    return { role: 'assistant', text, cards, mapButtons, proposal, choices, chosen: null, resolvedBy, failure: null };
  } catch (error) {
    const failure = error instanceof ApiError && error.status === 429 ? 'usedUp' : 'unavailable';
    const text = FAILURE_TEXT[failure];
    return {
      role: 'assistant',
      text,
      cards: [],
      mapButtons: [],
      proposal: null,
      choices: [],
      chosen: null,
      resolvedBy: [],
      failure,
    };
  }
}

function userBubble(text: string, chosen: Chosen | null): NewBubble {
  return {
    role: 'user',
    text,
    cards: [],
    mapButtons: [],
    proposal: null,
    choices: [],
    chosen,
    resolvedBy: [],
    failure: null,
  };
}

interface Bubbles {
  bubbles: readonly ChatBubble[];
  // What was said, as the next request sends it, without waiting for a render.
  said: { readonly current: readonly ChatBubble[] };
  show: (next: readonly ChatBubble[]) => void;
  add: (bubble: NewBubble) => number;
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
    (bubble: NewBubble): number => {
      nextId.current += 1;
      show([...said.current, { ...bubble, id: nextId.current }]);
      return nextId.current;
    },
    [show],
  );
  return { bubbles, said, show, add };
}

function sameReading(one: ResolvedBy, other: ResolvedBy): boolean {
  return one.kind === other.kind && one.words === other.words && one.id === other.id;
}

// 아니에요 of the conversation's bubbles: the line of that reading leaves its bubble once the main server took it.
function useRejectAlias({ said, show }: Pick<Bubbles, 'said' | 'show'>): Chat['rejectAlias'] {
  return useCallback(
    async (bubbleId: number, reading: ResolvedBy): Promise<void> => {
      await apiClient.rejectAlias({ kind: reading.kind, words: reading.words, targetId: reading.id });
      show(
        said.current.map((bubble) =>
          bubble.id === bubbleId
            ? { ...bubble, resolvedBy: bubble.resolvedBy.filter((held) => !sameReading(held, reading)) }
            : bubble,
        ),
      );
    },
    [said, show],
  );
}

// Asking the Assistant: the request for the conversation as it stands, the User's message last, with 다시 시도 and
// 새 대화.
function useAsking({ said, show, add }: Bubbles): {
  waiting: boolean;
  ask: () => void;
  retry: () => void;
  reset: () => void;
} {
  const [waiting, setWaiting] = useState(false);
  // Which conversation a reply belongs to: 새 대화 starts another, and a reply to the one before is dropped.
  const conversation = useRef(0);

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

  return { waiting, ask, retry, reset };
}

// An Assistant's bubble the app adds itself, with a Proposal the server made outside the chat.
function proposedBubble(text: string, proposal: QuestProposal): NewBubble {
  return {
    role: 'assistant',
    text,
    cards: [],
    mapButtons: [],
    proposal,
    choices: [],
    chosen: null,
    resolvedBy: [],
    failure: null,
  };
}

// The conversation with the Assistant, kept in memory by whoever holds the hook; the server keeps none of it. Each
// message sends the conversation, and the reply is shown whole.
export function useChat(): Chat {
  const held = useBubbles();
  const { add, said, show } = held;
  const { waiting, ask, retry, reset } = useAsking(held);

  const send = useCallback(
    (text: string): void => {
      add(userBubble(text, null));
      ask();
    },
    [add, ask],
  );

  const choose = useCallback(
    ({ kind, id, label, words }: Choice): void => {
      add(userBubble(label, { kind, id, words }));
      ask();
    },
    [add, ask],
  );

  const propose = useCallback(
    (text: string, proposal: QuestProposal): number => add(proposedBubble(text, proposal)),
    [add],
  );

  const rejectAlias = useRejectAlias({ said, show });

  return { bubbles: held.bubbles, waiting, send, choose, retry, rejectAlias, reset, propose };
}
