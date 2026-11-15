/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import type { Refusal } from '@/api/refusal-types';
import { isText } from '@/api/server/answers';
import { isRefusal } from '@/api/server/refusal-answers';
import copies from './refusals.json';

// The main server's reply to each board of row 8 that refuses, by the board's words, copied whole from the endpoint
// with the scripted model naming the case: asked on a Tuesday at 11:50, with the Friend 민수 in a Class in 302동 until
// 12:15. "배고파, 민수랑 같이" is the question package A's guard asks when the words fit two Friends, 김민수 and 이민수.

export type RefusalReply = AssistantReply & { refusal: Refusal };

function checked([words, reply]: [string, { text: unknown; refusal: unknown }]): [string, RefusalReply] {
  const { text, refusal } = reply;
  if (!isText(text) || !isRefusal(refusal)) {
    throw new Error(`The stored refusal for ${words} fails the check of a reply`);
  }
  return [words, { text, mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal }];
}

export const REFUSAL_REPLIES: ReadonlyMap<string, RefusalReply> = new Map(
  Object.entries(copies).map((entry) => checked(entry)),
);

// The copy whose board's words the message holds, or null.
export function refusalReplyTo(message: string): RefusalReply | null {
  for (const [words, reply] of REFUSAL_REPLIES) {
    if (message.includes(words)) {
      return reply;
    }
  }
  return null;
}
