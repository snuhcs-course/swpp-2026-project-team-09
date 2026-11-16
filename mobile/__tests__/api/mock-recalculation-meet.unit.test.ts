/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
import { mockRecalculation } from '@/api/mock/assistant';
import { MEET_ANSWER, MEET_ANSWER_FROM_14 } from '@/api/mock/data/meet-answer';

// The mock's choice of a stored copy for a meet (P02 tickets 24 and 25), each holding the conditions it was given: the
// copy of board a6 for a meet asked from 14:00, as a5's band let go at 14:00 asks it, and a5's for any other meet.

// Partitions: nothing fixed; the start fixed at 14:00, at another time, and only the end fixed at 14:00.
describe('the mock of a meet recalculated', () => {
  it('answers a meet with nothing fixed with the copy of a5', () => {
    expect(mockRecalculation(MEET_ANSWER.input)).toEqual(MEET_ANSWER);
  });

  it('answers a meet from 14:00 with the copy of a6', () => {
    expect(mockRecalculation(MEET_ANSWER_FROM_14.input)).toEqual(MEET_ANSWER_FROM_14);
  });

  it('answers a meet from another time with the copy of a5, holding the input it was given', () => {
    // a6's conditions with the start a step later, which no copy holds.
    const input: PlanInput = { ...MEET_ANSWER_FROM_14.input, window: { from: '14:05', until: null } };

    expect(mockRecalculation(input)).toEqual({ ...MEET_ANSWER, input });
  });

  it('answers a meet whose end alone is fixed at 14:00 with the copy of a5', () => {
    // a5's conditions with the end fixed at 14:00, the time of a6's start on the other bound.
    const input: PlanInput = { ...MEET_ANSWER.input, window: { from: null, until: '14:00' } };

    expect(mockRecalculation(input)).toEqual({ ...MEET_ANSWER, input });
  });
});
