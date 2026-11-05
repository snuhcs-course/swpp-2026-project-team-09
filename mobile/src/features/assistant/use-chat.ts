/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-03  Opus 5.5   prompted by fyoon46
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
import type { LibraryDone } from '@/library/cards/done';

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
  // The app's own bubble, never sent to the Assistant: what a library card says once it acted, or the card it gave.
  own?: boolean;
  // A booking a library card made, as its done message shows it.
  done?: LibraryDone;
}

// How a library card ended: what it says in place of its buttons. It is kept with the chat, so that a card that
// booked, cancelled, returned or was dismissed never offers its button again when the sheet opens anew.
export interface CardOutcome {
  // `pending` from the confirm press until the library answers, so that a sheet opened anew meanwhile offers no
  // button; the card clears it when the write fails.
  kind: 'pending' | 'booked' | 'declined' | 'cancelled' | 'returned' | 'stopped';
  words: string;
}

// What the app itself adds to the chat: words, the cards it gives and a booking made.
export interface OwnBubble {
  text: string;
  cards?: readonly ShownChatCard[];
  done?: LibraryDone;
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
  // Adds the app's own bubble, which no request sends.
  addOwn: (bubble: OwnBubble) => void;
  // How each library card of the conversation ended, by the card's place: its bubble and its key.
  outcomes: ReadonlyMap<string, CardOutcome>;
  finish: (card: string, outcome: CardOutcome) => void;
  // Forgets a card's mark: a write that was pending failed, and the card offers its button again.
  unfinish: (card: string) => void;
}

export const CHAT_FAILED = '지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요';
export const CHAT_USED_UP = '오늘은 여기까지 답할 수 있어요. 내일 다시 물어봐 주세요';

const FAILURE_TEXT: Record<ChatFailure, string> = { unavailable: CHAT_FAILED, usedUp: CHAT_USED_UP };

function textLength(messages: readonly ChatMessage[]): number {
  return messages.reduce((total, message) => total + lengthOf(message), 0);
}

// What a request sends of the conversation: the latest 20 messages without the failures and the app's own bubbles,
// fewer while they hold more characters than the main server takes. The last Proposal goes with its message, by its
// values, so that the Assistant can change one of its fields and keep the others.
export function messagesToSend(bubbles: readonly ChatBubble[]): ChatMessage[] {
  const said = bubbles.filter(({ failure, own = false }) => failure === null && !own);
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

// The app's own bubbles, added after what was said.
function useAddOwn(add: Bubbles['add']): Chat['addOwn'] {
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
        failure: null,
        own: true,
        done,
      });
    },
    [add],
  );
}

// How the library cards ended, kept with the conversation.
function useOutcomes(): Pick<Chat, 'outcomes' | 'finish' | 'unfinish'> & { forget: () => void } {
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

// Asks the Assistant to answer the conversation as it stands, the User's message last. `drop` starts another
// conversation, and a reply to the one before is dropped.
function useAsk({ said, add }: Pick<Bubbles, 'said' | 'add'>): { waiting: boolean; ask: () => void; drop: () => void } {
  const [waiting, setWaiting] = useState(false);
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
  const drop = useCallback((): void => {
    conversation.current += 1;
    setWaiting(false);
  }, []);
  return { waiting, ask, drop };
}

// The conversation with the Assistant, kept in memory by whoever holds the hook; the server keeps none of it. Each
// message sends the conversation, and the reply is shown whole.
export function useChat(): Chat {
  const { bubbles, said, show, add } = useBubbles();
  const { waiting, ask, drop } = useAsk({ said, add });

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

  const retry = useCallback((): void => {
    if (said.current.at(-1)?.failure !== 'unavailable') {
      return;
    }
    show(said.current.slice(0, -1));
    ask();
  }, [ask, said, show]);

  const { outcomes, finish, unfinish, forget } = useOutcomes();

  const reset = useCallback((): void => {
    drop();
    show([]);
    forget();
  }, [drop, forget, show]);

  const addOwn = useAddOwn(add);
  const rejectAlias = useRejectAlias({ said, show });

  return { bubbles, waiting, send, choose, retry, rejectAlias, reset, addOwn, outcomes, finish, unfinish };
}
