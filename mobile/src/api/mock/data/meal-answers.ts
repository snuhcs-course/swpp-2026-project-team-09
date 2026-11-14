/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import alone from './meal-answer-alone.json';
import fixedStart from './meal-answer-fixed-start.json';
import otherOrigin from './meal-answer-other-origin.json';
import three from './meal-answer-three.json';

// The main server's answers from `POST /assistant/answers`, asked on Tuesday 2026-11-17 at 11:50 and copied whole,
// with the users' ids renamed to those of `meal-answer.ts`.

function checked(copy: unknown, name: string): AnswerReply {
  if (!isAnswerReply(copy)) {
    throw new Error(`The stored answer ${name} fails the check of a reply`);
  }
  return copy;
}

// The User alone.
export const MEAL_ANSWER_ALONE = checked(alone, 'alone');

// The User with 민수 and 지은.
export const MEAL_ANSWER_THREE = checked(three, 'three');

// The User with 민수, the window's start fixed at 12:40.
export const MEAL_ANSWER_FIXED_START = checked(fixedStart, 'fixed start');

// The User with 민수, the User setting out from 학생회관.
export const MEAL_ANSWER_OTHER_ORIGIN = checked(otherOrigin, 'other origin');
