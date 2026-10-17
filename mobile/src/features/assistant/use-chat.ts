/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useCallback, useRef, useState } from 'react';
import type { ChatMessage } from '@/api/assistant-types';
import { apiClient } from '@/api/client';

// One bubble of the chat. A failed answer is shown, and never sent back to the Assistant.
export interface ChatBubble extends ChatMessage {
  id: number;
  failed: boolean;
}

export interface Chat {
  bubbles: readonly ChatBubble[];
  // While the Assistant works on the User's last message: the "···" bubble, and nothing more is sent.
  waiting: boolean;
  send: (text: string) => void;
}

export const CHAT_FAILED = '지금은 답할 수 없어요. 잠시 후 다시 시도해 주세요';

// The conversation with the Assistant, kept in memory by whoever holds the hook; the server keeps none of it. Each
// message sends the whole conversation, and the reply is shown whole.
export function useChat(): Chat {
  const [bubbles, setBubbles] = useState<readonly ChatBubble[]>([]);
  const [waiting, setWaiting] = useState(false);
  // What was said, as the next request sends it, without waiting for a render.
  const said = useRef<ChatBubble[]>([]);
  const nextId = useRef(0);

  const add = useCallback((message: ChatMessage, failed = false): void => {
    nextId.current += 1;
    said.current = [...said.current, { ...message, id: nextId.current, failed }];
    setBubbles(said.current);
  }, []);

  const send = useCallback(
    (text: string): void => {
      add({ role: 'user', text });
      setWaiting(true);
      const messages = said.current
        .filter(({ failed }) => !failed)
        .map(({ role, text: words }) => ({ role, text: words }));
      apiClient
        .askAssistant(messages)
        .then(
          (reply) => {
            add({ role: 'assistant', text: reply.text });
          },
          () => {
            add({ role: 'assistant', text: CHAT_FAILED }, true);
          },
        )
        .finally(() => {
          setWaiting(false);
        });
    },
    [add],
  );

  return { bubbles, waiting, send };
}
