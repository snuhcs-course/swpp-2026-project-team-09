/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
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
}

// The conversation outlives the frame: leaving hides the frame, and a reply on its way while it is hidden is kept
// without showing it. Whatever the User or the app adds to the conversation shows it again: a message, a turn of a
// card's button or of a mark, the app's own bubble. 새 대화 forgets the conversation and closes the frame.
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
        reset();
      },
    };
  }, [send, askApp, addRecalculated, addOwn, reset]);
  const hide = useCallback((): void => {
    setHidden(true);
  }, []);
  const showAgain = useCallback((): void => {
    setHidden(false);
  }, []);
  const held = chat.bubbles.length > 0 || chat.waiting;
  return { chat: { ...chat, ...showing }, framed: held && !hidden, hide, showAgain: held && hidden ? showAgain : null };
}
