/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useMemo, useState } from 'react';
import type { Chat } from '@/features/assistant/use-chat';

export interface KeptConversation {
  // The conversation, whose new turns show the frame again.
  chat: Chat;
  // The answer frame is on screen: the conversation holds something, and the frame was not left.
  framed: boolean;
  // Leaves the frame and keeps the conversation: ✕, Android's back button, a layer turned on, route guidance.
  hide: () => void;
  // "이전 답": shows the frame again as it was. Null while the frame is on screen or the conversation holds nothing.
  showAgain: (() => void) | null;
  // A reply arrived while the frame was hidden, until the frame is shown again.
  unseen: boolean;
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

// The conversation outlives the frame: leaving hides the frame, and a reply on its way while it is hidden is kept
// without showing it. Whatever the User or the app adds to the conversation shows it again: a message, a turn of a
// card's button or of a mark, the app's own bubble. 새 대화 forgets the conversation and closes the frame; the call it
// gives brings the conversation back with the frame.
export function useKeptConversation(chat: Chat): KeptConversation {
  const [hidden, setHidden] = useState(false);
  const { send, askApp, addRecalculated, addOwn, reset } = chat;
  const showing = useMemo((): Pick<Chat, 'send' | 'askApp' | 'addRecalculated' | 'addOwn' | 'reset'> => {
    const show = (): void => {
      setHidden(false);
    };
    return {
      send: (text, tapped) => {
        show();
        send(text, tapped);
      },
      askApp: (asked, reply) => {
        show();
        return askApp(asked, reply);
      },
      addRecalculated: (asked, answer) => {
        show();
        addRecalculated(asked, answer);
      },
      addOwn: (bubble) => {
        show();
        addOwn(bubble);
      },
      reset: () => {
        show();
        const undo = reset();
        return () => {
          show();
          undo();
        };
      },
    };
  }, [send, askApp, addRecalculated, addOwn, reset]);
  const { unseen, markSeen } = useUnseen(chat.bubbles, hidden);
  const hide = useCallback((): void => {
    setHidden(true);
    markSeen();
  }, [markSeen]);
  const showAgain = useCallback((): void => {
    setHidden(false);
  }, []);
  const held = chat.bubbles.length > 0 || chat.waiting;
  const kept = { framed: held && !hidden, hide, showAgain: held && hidden ? showAgain : null, unseen };
  return { chat: { ...chat, ...showing }, ...kept };
}
