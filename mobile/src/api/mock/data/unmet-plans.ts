/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, MealInput } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import eased from './meal-answer-eased.json';
import notNow from './meal-answer-not-now.json';

// The main server's answers to "민수, 지은이랑 지금 점심" when the three share no time now (board n11), from the endpoint
// with the scripted model calling planMeal with now, asked on a Tuesday at 11:50, and its recalculation from 13:00
// (board n11b), copied whole with the date made 2026-11-17 and the users' ids those of `meal-answer.ts`: the User in
// 301동 until 11:50 and in 24동 from 14:00, 민수 in 302동 until 12:15, and 지은 in 두산인문관 until 11:50 and from 12:00 to
// 12:50. The text is the sentence the rules ask the model for.

function checked(copy: unknown, name: string): AnswerReply & { input: MealInput } {
  if (!isAnswerReply(copy) || copy.input.kind !== 'meal') {
    throw new Error(`The stored answer ${name} fails the check of a reply`);
  }
  return { ...copy, input: copy.input };
}

export const NOT_NOW_ANSWER = checked(notNow, 'not now');

export const EASED_ANSWER = checked(eased, 'eased');

export const NOT_NOW_REPLY: AssistantReply & { answer: AnswerReply } = {
  text: '지금은 셋이 같이 먹을 때가 없어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: NOT_NOW_ANSWER,
  lookup: null,
  refusal: null,
};

// Board n11's words, which the mock answers with its copy.
export const NOT_NOW_ASKED = '민수, 지은이랑 지금 점심';
