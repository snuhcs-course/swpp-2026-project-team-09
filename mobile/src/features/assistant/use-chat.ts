/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useRef, useState } from 'react';
import {
  type AnswerReply,
  CHAT_HISTORY_MAX,
  type ChatMessage,
  lengthOf,
  type LibrarySpace,
  type MapLayer,
  MESSAGES_TOTAL_MAX,
  type QuestProposal,
  referenceOf,
  type RequestContext,
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
  failure: ChatFailure | null;
  // The app's own bubble, never sent to the Assistant: what a library card says once it acted, or the card it gave.
  own?: boolean;
  // A booking a library card made, as its done message shows it.
  done?: LibraryDone;
  // The answer an Assistant's reply drew on the map, or null. It is not sent back.
  answer?: AnswerReply | null;
}

// How a library card ended: what it says in place of its buttons. It is kept with the chat, so that a card that
// booked, cancelled, returned or was dismissed never offers its button again when the sheet opens anew.
export interface CardOutcome {
  // `pending` from the confirm press until the library answers, so that a sheet opened anew meanwhile offers no
  // button; the card clears it when the write fails.
  kind: 'pending' | 'booked' | 'declined' | 'cancelled' | 'returned' | 'stopped';
  words: string;
}

// A library card's place in the chat: its bubble and its key, since the same card may be shown twice.
export function cardPlace(bubbleId: number, key: string): string {
  return `${String(bubbleId)}:${key}`;
}

// The room a seat card shows in place of the one it came with: chosen from its list of rooms, or swapped in for one
// that was full. It is kept with the chat, as how a card ended is, and later requests send the card by `key`, the
// book card of the room shown.
export interface CardRoom {
  space: LibrarySpace;
  // The room 되돌리기 returns to: the card's own, or the one swapped in for it.
  first: LibrarySpace;
  // The card's own room, when it was full for the card's time.
  full: LibrarySpace | null;
  key: string;
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
  // Sends the User's last message again, after a failure the Assistant may get over.
  retry: () => void;
  // 새 대화: forgets the conversation, and a reply still on its way.
  reset: () => void;
  // Adds the app's own bubble, which no request sends.
  addOwn: (bubble: OwnBubble) => void;
  // How each library card of the conversation ended, by the card's place: its bubble and its key.
  outcomes: ReadonlyMap<string, CardOutcome>;
  finish: (card: string, outcome: CardOutcome) => void;
  // Forgets a card's mark: a write that was pending failed, and the card offers its button again.
  unfinish: (card: string) => void;
  // The rooms seat cards show in place of their own, by the card's place; null forgets one.
  rooms: ReadonlyMap<string, CardRoom>;
  showRoom: (card: string, room: CardRoom | null) => void;
}

export const CHAT_FAILED = '지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요';
export const CHAT_USED_UP = '오늘은 여기까지 답할 수 있어요. 내일 다시 물어봐 주세요';

const FAILURE_TEXT: Record<ChatFailure, string> = { unavailable: CHAT_FAILED, usedUp: CHAT_USED_UP };

function textLength(messages: readonly ChatMessage[]): number {
  return messages.reduce((total, message) => total + lengthOf(message), 0);
}

// What a request sends of the conversation: the latest 20 messages without the failures and the app's own bubbles,
// fewer while they hold more characters than the main server takes. The last Proposal goes with its message, by its
// values, so that the Assistant can change one of its fields and keep the others. A seat card that shows another
// room is sent as the card of that room.
export function messagesToSend(
  bubbles: readonly ChatBubble[],
  rooms: ReadonlyMap<string, CardRoom> = new Map(),
): ChatMessage[] {
  const said = bubbles.filter(({ failure, own = false }) => failure === null && !own);
  const proposing = said.findLast(({ proposal }) => proposal !== null);
  let messages = said
    .map((bubble): ChatMessage => {
      const { role, text, cards, proposal } = bubble;
      if (role === 'user') {
        return { role, text };
      }
      const references = cards.map((card) =>
        card.kind === 'library'
          ? { kind: card.kind, id: rooms.get(cardPlace(bubble.id, card.library.key))?.key ?? card.library.key }
          : referenceOf(card),
      );
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

// The Assistant's bubble for the conversation: its reply, or the failure. A request without a context is sent as
// before the answer on the map.
async function answerTo(messages: ChatMessage[], context: RequestContext | undefined): Promise<NewBubble> {
  try {
    const reply = await (context === undefined
      ? apiClient.askAssistant(messages)
      : apiClient.askAssistant(messages, context));
    const { text, cards, mapButtons, proposal, answer = null } = reply;
    return { role: 'assistant', text, cards, mapButtons, proposal, failure: null, answer };
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

// The app's own bubbles, added after what was said.
function useAddOwn(add: Bubbles['add']): Chat['addOwn'] {
  return useCallback(
    ({ text, cards = [], done }: OwnBubble): void => {
      add({ role: 'assistant', text, cards, mapButtons: [], proposal: null, failure: null, own: true, done });
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

// The rooms the seat cards show, kept with the conversation; `sent` holds them for a request without waiting for a
// render.
function useRooms(): Pick<Chat, 'rooms' | 'showRoom'> & {
  sent: { readonly current: ReadonlyMap<string, CardRoom> };
  forget: () => void;
} {
  const [rooms, setRooms] = useState<ReadonlyMap<string, CardRoom>>(new Map());
  const sent = useRef<ReadonlyMap<string, CardRoom>>(new Map());
  const keep = useCallback((next: ReadonlyMap<string, CardRoom>): void => {
    sent.current = next;
    setRooms(next);
  }, []);
  const showRoom = useCallback(
    (card: string, room: CardRoom | null): void => {
      const next = new Map(sent.current);
      if (room === null) {
        next.delete(card);
      } else {
        next.set(card, room);
      }
      keep(next);
    },
    [keep],
  );
  const forget = useCallback((): void => {
    keep(new Map());
  }, [keep]);
  return { rooms, showRoom, sent, forget };
}

// How the library cards ended and the rooms they show, forgotten together.
function useCardsKept(): ReturnType<typeof useOutcomes> & ReturnType<typeof useRooms> {
  const outcomes = useOutcomes();
  const rooms = useRooms();
  const { forget: forgetOutcomes } = outcomes;
  const { forget: forgetRooms } = rooms;
  const forget = useCallback((): void => {
    forgetOutcomes();
    forgetRooms();
  }, [forgetOutcomes, forgetRooms]);
  return { ...outcomes, ...rooms, forget };
}

// The conversation with the Assistant, kept in memory by whoever holds the hook; the server keeps none of it. Each
// message sends the conversation, and the reply is shown whole. `readContext` gives what the app knows when a request
// is sent, 다시 시도's included; without one, or while it gives none, the request carries no context.
export function useChat(readContext?: () => RequestContext | undefined): Chat {
  const { bubbles, said, show, add } = useBubbles();
  const context = useRef(readContext);
  context.current = readContext;
  const [waiting, setWaiting] = useState(false);
  // Which conversation a reply belongs to: 새 대화 starts another, and a reply to the one before is dropped.
  const conversation = useRef(0);
  const { outcomes, finish, unfinish, rooms, showRoom, sent: roomsShown, forget } = useCardsKept();

  // Asks the Assistant to answer the conversation as it stands, the User's message last.
  const ask = useCallback((): void => {
    const asked = conversation.current;
    setWaiting(true);
    void answerTo(messagesToSend(said.current, roomsShown.current), context.current?.()).then((answer) => {
      if (asked === conversation.current) {
        add(answer);
        setWaiting(false);
      }
    });
  }, [add, said, roomsShown]);

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
    forget();
    setWaiting(false);
  }, [forget, show]);

  const addOwn = useAddOwn(add);

  return { bubbles, waiting, send, retry, reset, addOwn, outcomes, finish, unfinish, rooms, showRoom };
}
