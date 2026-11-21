/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
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
  type ReplyOffer,
  type ReplyStep,
  type RequestContext,
  sentProposalOf,
} from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import type { Refusal } from '@/api/refusal-types';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import type { ShownChatCard } from '@/api/quest-parts-types';
import type { LibraryDone } from '@/library/cards/done';
import type { Slot } from '@/library/cards/payloads';
import { useAskApp } from './app-turn';
import { useLetGo, useWaiting } from './let-go';
import { shownText } from './shown-text';

type Tapped = NonNullable<RequestContext['tapped']>;

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
  // The answer or the Lookup an Assistant's reply drew on the map, or null. They are not sent back.
  answer?: AnswerReply | null;
  lookup?: Lookup | null;
  refusal?: Refusal | null;
  offers?: ReplyOffer[];
  // Each request of the message, in time order, when it asked for two or more (P03). They are not sent back.
  steps?: ReplyStep[];
  // The map's visible area the reply's request sent, which a `study` Lookup outlines.
  area?: RequestContext['viewport'];
  // A turn a card's button asked of the recalculation, not of the Assistant: its words and its answer are a turn and a
  // reply on screen, and never sent to the Assistant.
  recalculated?: boolean;
  // What a User's message was said of by a press, such as a Friend picked from a question: the requests that send it
  // last carry it as `tapped`, 다시 시도's included, and no later one does.
  tapped?: Tapped;
}

// How a library card ended: what it says in place of its buttons. It is kept with the chat, so that a card that
// booked, cancelled, returned or was dismissed never offers its button again when it is drawn anew.
export interface CardOutcome {
  // `pending` from the confirm press until the library answers, so that a card drawn anew meanwhile offers no
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
  // The time and the seat on screen, when the User changed them on the card (P15 ticket 57).
  slot?: Slot;
  seat?: string | null;
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
  send: (text: string, tapped?: Tapped) => void;
  // Sends the User's last message again, after a failure the Assistant may get over.
  retry: () => void;
  // 새 대화: forgets the conversation, and a reply still on its way. The call it gives brings the conversation back
  // while nothing new was said.
  reset: () => () => void;
  // 그만: takes back the question on its way, and drops its reply when it comes.
  stop: () => void;
  // Adds the app's own bubble, which no request sends.
  addOwn: (bubble: OwnBubble) => void;
  // Adds a turn a card's button asked of the recalculation: its words as what was asked, and its answer as the reply.
  addRecalculated: (asked: string, answer: AnswerReply) => void;
  // A turn the app asks itself, answered without the model, such as a tap on a mark of the map: `asked` stands as the
  // User's words and `reply`'s answer as the Assistant's. `forgotten` when the conversation was forgotten meanwhile;
  // a failure takes the turn back.
  askApp: (asked: string, reply: () => Promise<AnswerReply>) => Promise<'shown' | 'forgotten' | 'failed'>;
  // How each library card of the conversation ended, by the card's place: its bubble and its key.
  outcomes: ReadonlyMap<string, CardOutcome>;
  finish: (card: string, outcome: CardOutcome) => void;
  // Forgets a card's mark: a write that was pending failed, and the card offers its button again.
  unfinish: (card: string) => void;
  // The rooms seat cards show in place of their own, by the card's place; null forgets one.
  rooms: ReadonlyMap<string, CardRoom>;
  showRoom: (card: string, room: CardRoom | null) => void;
}

// Two lines: what failed, then why and where the words are (the input holds them again).
export const CHAT_FAILED =
  '답을 가져오지 못했어요.\n연결이 끊겼거나 서버가 답하지 않았어요. 쓴 말은 입력칸에 그대로 두었어요.';
export const CHAT_USED_UP = '오늘은 여기까지 답할 수 있어요. 내일 다시 물어봐 주세요';

const FAILURE_TEXT: Record<ChatFailure, string> = { unavailable: CHAT_FAILED, usedUp: CHAT_USED_UP };

function textLength(messages: readonly ChatMessage[]): number {
  return messages.reduce((total, message) => total + lengthOf(message), 0);
}

// What a request sends of the conversation: the latest 20 messages without the failures and the app's own bubbles,
// fewer while they hold more characters than the main server takes. The last Proposal goes with its message, by its
// values, so that the Assistant can change one of its fields and keep the others. A seat card that shows another
// room is sent as the card of that room. A reply is sent as the User saw it (`shownText`).
export function messagesToSend(
  bubbles: readonly ChatBubble[],
  rooms: ReadonlyMap<string, CardRoom> = new Map(),
): ChatMessage[] {
  const said = bubbles.filter(
    ({ failure, own = false, recalculated = false }) => failure === null && !own && !recalculated,
  );
  const proposing = said.findLast(({ proposal }) => proposal !== null);
  let messages = said
    .map((bubble): ChatMessage => {
      const { role, cards, proposal } = bubble;
      if (role === 'user') {
        return { role, text: bubble.text };
      }
      const text = shownText(bubble);
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

function withTapped(context: RequestContext, bubbles: readonly ChatBubble[]): RequestContext {
  const tapped = bubbles.findLast(({ role }) => role === 'user')?.tapped;
  return tapped === undefined ? context : { ...context, tapped };
}

// The Assistant's bubble for the conversation: its reply, or the failure.
async function answerTo(messages: ChatMessage[], context: RequestContext): Promise<NewBubble> {
  try {
    const reply = await apiClient.askAssistant(messages, context);
    const { text, cards, mapButtons, proposal, answer = null, lookup = null, refusal = null, offers, steps } = reply;
    const drawn = { answer, lookup, refusal, area: context.viewport };
    const offered = offers === undefined || offers.length === 0 ? {} : { offers };
    const stepped = steps === undefined || steps.length < 2 ? {} : { steps };
    return { role: 'assistant', text, cards, mapButtons, proposal, failure: null, ...drawn, ...offered, ...stepped };
  } catch (error) {
    const failure = error instanceof ApiError && error.status === 429 ? 'usedUp' : 'unavailable';
    return { role: 'assistant', text: FAILURE_TEXT[failure], cards: [], mapButtons: [], proposal: null, failure };
  }
}

export interface Bubbles {
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

// The app's own bubbles, added after what was said, and the turns of a card's button.
function useAddOwn(add: Bubbles['add'], takeBack: () => void): Pick<Chat, 'addOwn' | 'addRecalculated'> {
  const addOwn = useCallback(
    ({ text, cards = [], done }: OwnBubble): void => {
      add({ role: 'assistant', text, cards, mapButtons: [], proposal: null, failure: null, own: true, done });
    },
    [add],
  );
  const addRecalculated = useCallback(
    (asked: string, answer: AnswerReply): void => {
      takeBack();
      const parts = { cards: [], mapButtons: [], proposal: null, failure: null, recalculated: true };
      add({ role: 'user', text: asked, ...parts });
      add({ role: 'assistant', text: '', ...parts, answer });
    },
    [add, takeBack],
  );
  return { addOwn, addRecalculated };
}

// How the library cards ended, kept with the conversation by each card's place.
function useOutcomes(): Pick<Chat, 'outcomes' | 'finish' | 'unfinish'> {
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
  return { outcomes, finish, unfinish };
}

// The rooms the seat cards show, kept with the conversation; `sent` holds them for a request without waiting for a
// render.
function useRooms(): Pick<Chat, 'rooms' | 'showRoom'> & {
  sent: { readonly current: ReadonlyMap<string, CardRoom> };
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
  return { rooms, showRoom, sent };
}

// How the library cards ended and the rooms they show.
function useCardsKept(): ReturnType<typeof useOutcomes> & ReturnType<typeof useRooms> {
  return { ...useOutcomes(), ...useRooms() };
}

// The conversation with the Assistant, kept in memory by whoever holds the hook; the server keeps none of it. Each
// message sends the conversation, and the reply is shown whole. `readContext` gives what the app knows when a request
// is sent, 다시 시도's included.
export function useChat(readContext: () => RequestContext): Chat {
  const { bubbles, said, show, add } = useBubbles();
  const context = useRef(readContext);
  context.current = readContext;
  const { waiting, setWaiting, waitingNow } = useWaiting();
  // Which conversation a reply belongs to: 새 대화 and 그만 start another, and a reply to the one before is dropped.
  const conversation = useRef(0);
  const { outcomes, finish, unfinish, rooms, showRoom, sent: roomsShown } = useCardsKept();
  const { reset, stop, takeBack } = useLetGo({ said, show }, conversation, { setWaiting, waitingNow });

  // Asks the Assistant to answer the conversation as it stands, the User's message last.
  const ask = useCallback((): void => {
    const asked = conversation.current;
    setWaiting(true);
    void answerTo(messagesToSend(said.current, roomsShown.current), withTapped(context.current(), said.current)).then(
      (answer) => {
        if (asked === conversation.current) {
          add(answer);
          setWaiting(false);
        }
      },
    );
  }, [add, said, roomsShown, setWaiting]);

  // A message while a reply is on its way takes that question back first.
  const send = useCallback(
    (text: string, tapped?: Tapped): void => {
      takeBack();
      add({ role: 'user', text, cards: [], mapButtons: [], proposal: null, failure: null, tapped });
      ask();
    },
    [add, ask, takeBack],
  );

  const retry = useCallback((): void => {
    if (said.current.at(-1)?.failure !== 'unavailable') {
      return;
    }
    show(said.current.slice(0, -1));
    ask();
  }, [ask, said, show]);

  const own = useAddOwn(add, takeBack);
  const askApp = useAskApp({ said, show, add }, conversation, setWaiting, takeBack);

  return { bubbles, waiting, send, retry, reset, stop, ...own, askApp, outcomes, finish, unfinish, rooms, showRoom };
}
