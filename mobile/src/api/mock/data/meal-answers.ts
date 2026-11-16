/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MealInput } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import alone from './meal-answer-alone.json';
import fixedPlace from './meal-answer-fixed-place.json';
import fixedStart from './meal-answer-fixed-start.json';
import otherOrigin from './meal-answer-other-origin.json';
import three from './meal-answer-three.json';
import unfitPlace from './meal-answer-unfit-place.json';

// The main server's answers from `POST /assistant/answers`, asked on Tuesday 2026-11-17 at 11:50 and copied whole,
// with the users' ids renamed to those of `meal-answer.ts`.

function checked(copy: unknown, name: string): AnswerReply & { input: MealInput } {
  if (!isAnswerReply(copy) || copy.input.kind !== 'meal') {
    throw new Error(`The stored answer ${name} fails the check of a reply`);
  }
  return { ...copy, input: copy.input };
}

// The User alone.
export const MEAL_ANSWER_ALONE = checked(alone, 'alone');

// The User with 민수 and 지은.
export const MEAL_ANSWER_THREE = checked(three, 'three');

// The User with 민수, the window's start fixed at 12:40.
export const MEAL_ANSWER_FIXED_START = checked(fixedStart, 'fixed start');

// The User with 민수, the User setting out from 학생회관.
export const MEAL_ANSWER_OTHER_ORIGIN = checked(otherOrigin, 'other origin');

// "여기면 어때?" with 민수 and 지은 (boards a7 and a8), written by the main server's own calculation and words on the
// seed's walking table: 자하연식당 pressed, which fits, and 301동식당 pressed, which does not.
export const MEAL_ANSWER_FIXED_PLACE = checked(fixedPlace, 'fixed Place');
export const MEAL_ANSWER_UNFIT_PLACE = checked(unfitPlace, 'unfit Place');
