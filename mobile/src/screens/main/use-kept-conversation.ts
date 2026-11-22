/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useMemo, useState } from 'react';
import { turnsOf } from '@/features/assistant/turn';
import type { Chat, ChatBubble } from '@/features/assistant/use-chat';

export interface KeptConversation {
  // The conversation, whose new turns show the frame again. Its `bubbles` end with the turn on screen, which a
  // question of the list may set to an earlier one (`showTurn`).
  chat: Chat;
  // The whole current conversation, whatever turn is on screen, and whether a reply is on its way for it.
  said: readonly ChatBubble[];
  asking: boolean;
  // The answer frame is on screen: the conversation holds something, and the frame was not left.
  framed: boolean;
  // Leaves the frame and keeps the conversation: ✕, Android's back button, a layer turned on, route guidance.
  hide: () => void;
  // "이전 답": shows the frame again as it was. Null while the frame is on screen or the conversation holds nothing.
  showAgain: (() => void) | null;
  // A reply arrived while the frame was hidden, until the frame is shown again.
  unseen: boolean;
  // A question of the list: its turn of the current conversation on screen, or an earlier conversation taken up again
  // at that turn; either shows the frame.
  showTurn: (turnId: number, conversation: number | null) => void;
  // Counts each "새 대화" and "＋ 새 질문", so that the map screen puts the focus in the input.
  started: number;
  // "＋ 새 질문": the focus in the main map's input, once the frame is left (P04 ticket 44).
  focusInput: () => void;
  // The turn on screen is the conversation's latest: only then do 다시 시도 and the failed words put back act on it.
  latest: boolean;
}

// Whether a bubble came after the last one seen, while the frame is hidden: a reply the User has not seen.
function useUnseen(bubbles: Chat['bubbles'], hidden: boolean): { unseen: boolean; markSeen: () => void } {
  const [seenUpTo, setSeenUpTo] = useState<number | null>(null);
  const last = bubbles.at(-1)?.id ?? null;
  const markSeen = useCallback((): void => {
    setSeenUpTo(last);
  }, [last]);
  return { unseen: hidden && last !== null && last !== seenUpTo, markSeen };
}

// An earlier turn on screen, while the conversation's last bubble is still `lastId`: whatever is added after it, a
// reply or a new turn, puts the latest turn on screen again.
interface Viewed {
  turnId: number;
  lastId: number | null;
}

// The bubbles up to the end of the turn viewed, or all of them.
function viewOf(bubbles: readonly ChatBubble[], viewed: Viewed | null): readonly ChatBubble[] | null {
  if (viewed === null || viewed.lastId !== (bubbles.at(-1)?.id ?? null)) {
    return null;
  }
  const turns = turnsOf(bubbles);
  const next = turns[turns.findIndex(({ id }) => id === viewed.turnId) + 1];
  if (next === undefined) {
    return null;
  }
  return bubbles.slice(
    0,
    bubbles.findIndex(({ id }) => id === next.id),
  );
}

type Showing = Pick<Chat, 'send' | 'sendNew' | 'askApp' | 'addRecalculated' | 'addOwn' | 'resume'>;

// What adds to the conversation shows the frame again.
function useShowing(chat: Chat, show: () => void, end: number | undefined): Showing {
  const { send, sendNew, askApp, addRecalculated, addOwn, resume } = chat;
  return useMemo(
    (): Showing => ({
      send: (text, tapped, mentions) => {
        show();
        send(text, tapped, mentions);
      },
      sendNew: (text, tapped, mentions) => {
        show();
        sendNew(text, tapped, mentions);
      },
      askApp: (asked, reply) => {
        show();
        return askApp(asked, reply);
      },
      addRecalculated: (asked, answer) => {
        show();
        addRecalculated(asked, answer);
      },
      // A card of an earlier turn on screen adds to that turn, which stays on screen.
      addOwn: (bubble) => {
        show();
        addOwn(bubble, end);
      },
      resume: (id) => {
        show();
        resume(id);
      },
    }),
    [send, sendNew, askApp, addRecalculated, addOwn, resume, show, end],
  );
}

// Whether the frame was left, and whether a reply came since.
function useHidden(bubbles: Chat['bubbles']): { hidden: boolean; show: () => void; hide: () => void; unseen: boolean } {
  const [hidden, setHidden] = useState(false);
  const show = useCallback((): void => {
    setHidden(false);
  }, []);
  const { unseen, markSeen } = useUnseen(bubbles, hidden);
  const hide = useCallback((): void => {
    setHidden(true);
    markSeen();
  }, [markSeen]);
  return { hidden, show, hide, unseen };
}

// The conversation outlives the frame: leaving hides the frame, and a reply on its way while it is hidden is kept
// without showing it. Whatever the User or the app adds to the conversation shows it again: a message, a turn of a
// card's button or of a mark, the app's own bubble. 새 대화 keeps the conversation among the earlier ones and closes
// the frame, which an earlier conversation's question shows again with that conversation (P04 ticket 10).
export function useKeptConversation(chat: Chat): KeptConversation {
  const { hidden, show, hide, unseen } = useHidden(chat.bubbles);
  const [viewed, setViewed] = useState<Viewed | null>(null);
  const [started, setStarted] = useState(0);
  const { bubbles, earlier } = chat;
  const view = useMemo(() => viewOf(bubbles, viewed), [bubbles, viewed]);
  const showing = useShowing(chat, show, view?.at(-1)?.id);
  const { resume } = showing;
  const { startNew } = chat;
  const startAgain = useCallback((): void => {
    setViewed(null);
    setStarted((count) => count + 1);
    startNew();
  }, [startNew]);
  const showTurn = useCallback(
    (turnId: number, conversation: number | null): void => {
      const shown = conversation === null ? bubbles : earlier.find(({ id }) => id === conversation)?.bubbles;
      if (shown === undefined) {
        return;
      }
      if (conversation !== null) {
        resume(conversation);
      }
      show();
      setViewed({ turnId, lastId: shown.at(-1)?.id ?? null });
    },
    [bubbles, earlier, resume, show],
  );
  const focusInput = useCallback((): void => {
    setStarted((count) => count + 1);
  }, []);
  const held = bubbles.length > 0 || chat.waiting;
  const onScreen = view === null ? chat : { ...chat, bubbles: view, waiting: false };
  return {
    chat: { ...onScreen, ...showing, startNew: startAgain },
    said: bubbles,
    asking: chat.waiting,
    framed: held && !hidden,
    hide,
    showAgain: held && hidden ? show : null,
    unseen,
    showTurn,
    started,
    focusInput,
    latest: view === null,
  };
}
