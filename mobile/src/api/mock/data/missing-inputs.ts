/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, MealInput } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import noLocation from './meal-answer-no-location.json';
import noTimetable from './meal-answer-no-timetable.json';

// The main server's answers to "배고파" when an input was missing, from the endpoint with the scripted model calling
// planMeal, asked on a Tuesday at 11:50, copied whole with the date made 2026-11-17 and the User's id that of
// `meal-answer.ts`: without the location permission, a Class in 301동 over at 11:50 and one in 24동 at 13:00 (board
// n13), and at 301동 with no Class in the Timetable (board n15). The texts are the sentences the rules ask the model
// for.

function checked(copy: unknown, name: string): AnswerReply & { input: MealInput } {
  if (!isAnswerReply(copy) || copy.input.kind !== 'meal') {
    throw new Error(`The stored answer ${name} fails the check of a reply`);
  }
  return { ...copy, input: copy.input };
}

export const NO_LOCATION_ANSWER = checked(noLocation, 'no location');

export const NO_TIMETABLE_ANSWER = checked(noTimetable, 'no Timetable');

function replyOf(text: string, answer: AnswerReply): AssistantReply & { answer: AnswerReply } {
  return { text, mapButtons: [], cards: [], proposal: null, answer, lookup: null, refusal: null };
}

export const NO_LOCATION_REPLY = replyOf(
  '어디서 출발하는지 몰라서 가장 일찍 여는 301동식당을 추천해요.',
  NO_LOCATION_ANSWER,
);

export const NO_TIMETABLE_REPLY = replyOf('가장 가까운 301동식당을 추천해요.', NO_TIMETABLE_ANSWER);
