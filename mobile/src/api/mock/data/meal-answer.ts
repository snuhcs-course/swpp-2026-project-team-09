/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply } from '@/api/assistant-types';
import { MEAL_PLAN_1 } from './meal-answer-plan-1';
import { MEAL_PLAN_2 } from './meal-answer-plan-2';
import { MEAL_PLAN_3 } from './meal-answer-plan-3';
import { MEAL_PLAN_4 } from './meal-answer-plan-4';
import { MEAL_PLAN_5 } from './meal-answer-plan-5';

// The main server's reply to "배고파, 민수랑 같이", asked on Tuesday 2026-11-17 at 11:50 with the real model, copied
// whole: its text and the answer it drew on the map, its plans one to a file.

export const MEAL_ANSWER: AnswerReply = {
  input: {
    kind: 'meal',
    date: '2026-11-17',
    meal: 'lunch',
    people: [
      { userId: '11ca538e-e4ef-48d9-9a1f-b7160c553bee', constraints: [] },
      { userId: '35976b5c-4daf-454f-b10e-c8b09a33ca37', constraints: [] },
    ],
    window: { from: null, until: null },
    placeId: null,
  },
  chips: [
    { kind: 'origin', text: '301동에서', userId: null },
    { kind: 'until', text: '13:00 수업까지', userId: null },
    { kind: 'person', text: '민수', userId: '35976b5c-4daf-454f-b10e-c8b09a33ca37' },
  ],
  plans: [MEAL_PLAN_1, MEAL_PLAN_2, MEAL_PLAN_3, MEAL_PLAN_4, MEAL_PLAN_5],
  dropped: [],
  noPlan: null,
};

export const MEAL_ANSWER_REPLY: AssistantReply & { answer: AnswerReply } = {
  text: '12:15에 302동식당에서 민수와 만나 먹어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: MEAL_ANSWER,
};
