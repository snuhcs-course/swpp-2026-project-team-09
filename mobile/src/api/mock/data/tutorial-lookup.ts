/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import type { Lookup } from '@/api/lookup-types';
import { isLookup } from '@/api/server/lookup-answers';
import copy from './tutorial-lookup.json';

// The main server's Lookup for "새내기 퀘스트 뭐부터?", asked on Tuesday 2026-11-17 at 13:50 as a Class in 24동 ends,
// with the next at 17:00 in 58동 and three Tutorial Quests left (the 보건진료소, the 학생증, and the 분실물센터), copied
// whole, with the User's id that of `meal-answer.ts`.

function checked(value: unknown): Lookup {
  if (!isLookup(value)) {
    throw new Error('The stored Lookup fails the check of a reply');
  }
  return value;
}

export const TUTORIAL_LOOKUP = checked(copy);

export const TUTORIAL_LOOKUP_REPLY: AssistantReply & { lookup: Lookup } = {
  text: '17:00 수업 전에 세 곳을 가장 적게 걸어서 돌 수 있어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: TUTORIAL_LOOKUP,
};
