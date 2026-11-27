/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MealInput } from '@/api/assistant-types';
import { isAnswerReply } from '@/api/server/plan-answers';
import copy from './no-plan-band.json';

// The main server's answer with no Plan and the band of the window asked for (P01 ticket 31, P05 ticket 65), copied as
// JSON unchanged from its fixture (`main-server/test/fixtures/no-plan-band.json`), which its test checks the real
// answer against: lunch with 민수 and 서준 on Wednesday 2026-11-04, asked at 12:10, with 나's 12:00 301동 Class left out;
// 민수 is in a Class all lunch and 서준 from 13:00, so nobody is free together. 지은 is a Friend to add.
function checked(value: unknown): AnswerReply & { input: MealInput } {
  if (!isAnswerReply(value) || value.input.kind !== 'meal' || value.noPlan?.band === undefined) {
    throw new Error('The stored answer with no Plan fails the check of a reply with its band');
  }
  return { ...value, input: value.input };
}

export const NO_PLAN_BAND_ANSWER = checked(copy);
