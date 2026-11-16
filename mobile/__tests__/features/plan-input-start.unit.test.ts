/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
import { EVENTS_ANSWER } from '@/api/mock/data/events-answer';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { withStart } from '@/features/assistant/plan-input';

// The conditions a band moved whole asks with (P02 ticket 25, "Letting go"): the band's start as the window's `from`,
// and `until` left to the server. Expected values: the ticket and board a6 (the meet of a5 let go at 14:00).

describe('withStart', () => {
  // Partitions: a meet with nothing fixed (board a6); a meal with its end fixed, which the server then leaves open, and
  // with its start fixed earlier; conditions without a window.
  it("sets a meet's start and leaves its end open (board a6)", () => {
    expect(withStart(MEET_ANSWER.input, '14:00')).toEqual({
      ...MEET_ANSWER.input,
      window: { from: '14:00', until: null },
    });
  });

  it("opens a meal's end that the User had fixed", () => {
    // The stored meal's window with its end fixed at 13:10, as a drag of the end handle leaves it.
    const fixedEnd: PlanInput = { ...MEAL_ANSWER.input, window: { from: null, until: '13:10' } };

    expect(withStart(fixedEnd, '12:25')).toEqual({ ...MEAL_ANSWER.input, window: { from: '12:25', until: null } });
  });

  it("sets a meal's start in place of an earlier one", () => {
    // The stored meal's window with its start fixed at 12:40, as the fixed start's answer holds it.
    const fixedStart: PlanInput = { ...MEAL_ANSWER.input, window: { from: '12:40', until: null } };

    expect(withStart(fixedStart, '12:20')).toEqual({ ...MEAL_ANSWER.input, window: { from: '12:20', until: null } });
  });

  it('changes nothing for conditions without a window', () => {
    expect(withStart(EVENTS_ANSWER.input, '14:00')).toBe(EVENTS_ANSWER.input);
  });
});
