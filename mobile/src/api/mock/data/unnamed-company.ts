/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from './meal-answer';
import { MEAL_ANSWER_ALONE } from './meal-answers';

// A meal with company the User does not name (P04 ticket 73: "친구 두명이랑 저녁", "누구랑 같이 먹을까"): the main
// server plans it for the User alone, and the app opens the picking of Friends on it.
const UNNAMED_COMPANY = /친구[^,.?]*(?:랑|하고|와|과)|누구랑/u;
const MEAL_WORDS = /밥|점심|저녁|먹/u;

export function asksUnnamedCompany(words: string): boolean {
  return UNNAMED_COMPANY.test(words) && MEAL_WORDS.test(words);
}

export const UNNAMED_COMPANY_REPLY: AssistantReply = {
  ...MEAL_ANSWER_REPLY,
  text: '11:50에 301동식당에서 먹어요.',
  answer: { ...MEAL_ANSWER_ALONE, pickPeople: true },
};
