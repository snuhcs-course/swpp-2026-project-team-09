/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
import { mockRecalculation } from '@/api/mock/assistant';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import {
  MEAL_ANSWER_ALONE,
  MEAL_ANSWER_FIXED_PLACE,
  MEAL_ANSWER_FIXED_START,
  MEAL_ANSWER_OTHER_ORIGIN,
  MEAL_ANSWER_THREE,
  MEAL_ANSWER_UNFIT_PLACE,
} from '@/api/mock/data/meal-answers';

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

// Partitions: a fixed start; a fixed start with the User's own start; only the end fixed.
describe('the mock of a recalculation with a window', () => {
  it('answers a fixed start with the copy for a fixed start', () => {
    expect(mockRecalculation(MEAL_ANSWER_FIXED_START.input)).toEqual(MEAL_ANSWER_FIXED_START);
  });

  it("answers a fixed start with the copy for a fixed start, also with the User's own start", () => {
    // The other-origin copy's input with the start of the fixed-start copy's window.
    const input: PlanInput = { ...MEAL_ANSWER_OTHER_ORIGIN.input, window: MEAL_ANSWER_FIXED_START.input.window };

    expect(mockRecalculation(input)).toEqual({ ...MEAL_ANSWER_FIXED_START, input });
  });

  it('answers a window that fixes only its end with the first copy', () => {
    // The first copy's input with its end fixed at 13:00, which takes no copy of its own.
    const input: PlanInput = { ...MEAL_ANSWER.input, window: { from: null, until: '13:00' } };

    expect(mockRecalculation(input)).toEqual({ ...MEAL_ANSWER, input });
  });
});

// Partitions: three people at 자하연식당, at 301동식당, and at a Place with no copy; two people at 자하연식당.
describe('the mock of a recalculation at a pressed Place', () => {
  it('answers 자하연식당 with the copy of a7, and 301동식당 with the copy of a8', () => {
    expect(mockRecalculation(MEAL_ANSWER_FIXED_PLACE.input)).toEqual(MEAL_ANSWER_FIXED_PLACE);
    expect(mockRecalculation(MEAL_ANSWER_UNFIT_PLACE.input)).toEqual(MEAL_ANSWER_UNFIT_PLACE);
  });

  it('answers a Place with no copy with the copy for three', () => {
    const input: PlanInput = { ...MEAL_ANSWER_THREE.input, placeId: 'place-without-copy' };

    expect(mockRecalculation(input)).toEqual({ ...MEAL_ANSWER_THREE, input });
  });

  it('answers two people at 자하연식당 with the first copy', () => {
    const input: PlanInput = { ...MEAL_ANSWER.input, placeId: MEAL_ANSWER_FIXED_PLACE.input.placeId };

    expect(mockRecalculation(input)).toEqual({ ...MEAL_ANSWER, input });
  });
});
