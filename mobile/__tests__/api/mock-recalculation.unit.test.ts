/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
import { mockRecalculation } from '@/api/mock/assistant';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_OTHER_ORIGIN, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';

// The mock's choice of a stored copy for a recalculation (P02 spec, "The mock client"), each holding the conditions
// it was given. The inputs are the stored copies' own.

const FROM_63 = MEAL_ANSWER_OTHER_ORIGIN.input.people[0]?.constraints ?? [];

// Partitions: one person; two; three; four; the asker with a `from` constraint, with two people and with one.
describe('the mock of a recalculation', () => {
  it('answers the User alone with the copy for the User alone', () => {
    expect(mockRecalculation(MEAL_ANSWER_ALONE.input)).toEqual(MEAL_ANSWER_ALONE);
  });

  it('answers three people with the copy for three', () => {
    expect(mockRecalculation(MEAL_ANSWER_THREE.input)).toEqual(MEAL_ANSWER_THREE);
  });

  it('answers four people with the copy for three, holding the four', () => {
    // The input for three with a fourth person added, past the boundary.
    const input: PlanInput = {
      ...MEAL_ANSWER_THREE.input,
      people: [...MEAL_ANSWER_THREE.input.people, { userId: 'u4', constraints: [] }],
    };

    expect(mockRecalculation(input)).toEqual({ ...MEAL_ANSWER_THREE, input });
  });

  it("answers the User's own start with the copy from another starting Place", () => {
    expect(mockRecalculation(MEAL_ANSWER_OTHER_ORIGIN.input)).toEqual(MEAL_ANSWER_OTHER_ORIGIN);
  });

  it("answers the User alone with the copy for the User alone, also with the User's own start", () => {
    // The input for the User alone with the User's start of the other-origin copy.
    const [asker] = MEAL_ANSWER_ALONE.input.people;
    const input: PlanInput = {
      ...MEAL_ANSWER_ALONE.input,
      people: asker === undefined ? [] : [{ ...asker, constraints: FROM_63 }],
    };

    expect(mockRecalculation(input)).toEqual({ ...MEAL_ANSWER_ALONE, input });
  });

  it('answers two people without a start of their own with the first copy', () => {
    expect(mockRecalculation(MEAL_ANSWER.input)).toEqual(MEAL_ANSWER);
  });
});
