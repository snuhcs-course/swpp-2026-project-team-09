/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { isLookup } from '@/api/server/lookup-answers';
import copy from './study-lookup.json';

// The main server's Lookup for "이 근처 조용히 공부할 곳" (board a9), asked on Tuesday 2026-11-17 at 12:10 at 301동 by a
// student of 경제학부, with the map moved over 공대, copied whole, with the User's id that of `meal-answer.ts`.

function checked(value: unknown): Lookup {
  if (!isLookup(value)) {
    throw new Error('The stored Lookup fails the check of a reply');
  }
  return value;
}

export const STUDY_LOOKUP = checked(copy);

export const STUDY_LOOKUP_REPLY: AssistantReply & { lookup: Lookup } = {
  text: '보이는 범위에선 공대 신양학술정보관 3층 자유열람실에서 12:52까지 34분 있을 수 있어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: STUDY_LOOKUP,
};
