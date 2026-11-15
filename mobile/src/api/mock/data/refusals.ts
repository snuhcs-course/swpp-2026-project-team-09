/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import type { Refusal } from '@/api/refusal-types';
import { isText } from '@/api/server/answers';
import { isLookup } from '@/api/server/lookup-answers';
import { isRefusal } from '@/api/server/refusal-answers';
import copies from './refusals.json';

// The main server's reply to each board of row 8 that refuses, by the board's words, copied whole from the endpoint
// with the scripted model naming the case: asked on a Tuesday at 11:50, with the Friend 민수 in a Class in 302동 until
// 12:15, and "신양 스터디룸 예약해 줘" at 14:10 at 301동. The replies of boards n4 and n20 keep the Lookup the refusal
// stands beside, 민수's with the id of `meal-answer.ts`.

export type RefusalReply = AssistantReply & { refusal: Refusal };

function checked([words, reply]: [string, { text: unknown; refusal: unknown; lookup: unknown }]): [
  string,
  RefusalReply,
] {
  const { text, refusal, lookup } = reply;
  if (!isText(text) || !isRefusal(refusal) || !(lookup === null || isLookup(lookup))) {
    throw new Error(`The stored refusal for ${words} fails the check of a reply`);
  }
  return [words, { text, mapButtons: [], cards: [], proposal: null, answer: null, lookup, refusal }];
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
