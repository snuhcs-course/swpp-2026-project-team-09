/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanInput } from '@/api/assistant-types';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { leftOut, ONE_PM, THREE_PM } from '@/api/mock/data/skipped-classes';
import { isAnswerReply } from '@/api/server/plan-answers';
import { withoutSkipped } from '@/features/assistant/plan-input';

// The Classes left out of a meal's plan (P04 ticket 93): the app's check of an answer that carries them, and the
// conditions with one put back. Partitions: the field absent (a main server before it), as the main server writes it,
// and of another shape; put back, one of two, the last, one not left out, and conditions of another kind. Expected
// values: main-server `assistant/dto/answer.dto.ts` (`MealInput.skipped`, `TimeBand.skipped`).

const TWO = leftOut([ONE_PM, THREE_PM]);
const [FIRST] = TWO.plans;

describe('the check of an answer with Classes left out', () => {
  it('passes the answer as the main server writes it, and one without them', () => {
    expect(isAnswerReply(TWO)).toBe(true);
    expect(isAnswerReply(MEAL_ANSWER)).toBe(true);
  });

  it.each([
    ['an input whose ids are not text', { ...TWO, input: { ...TWO.input, skipped: [7] } }],
    ['an input whose Classes are not a list', { ...TWO, input: { ...TWO.input, skipped: ONE_PM.id } }],
    [
      'a band whose Class has no label',
      {
        ...TWO,
        plans: [{ ...FIRST, band: { ...FIRST?.band, skipped: [{ id: ONE_PM.id, startAt: ONE_PM.startAt }] } }],
      },
    ],
  ])('fails %s', (_, answer) => {
    expect(isAnswerReply(answer)).toBe(false);
  });
});

describe('the conditions with a Class put back', () => {
  it('keep the others left out', () => {
    expect(withoutSkipped(TWO.input, ONE_PM.id)).toEqual({ ...TWO.input, skipped: [THREE_PM.id] });
  });

  it('lose the field with the last, as a main server before it reads them', () => {
    const one = leftOut([ONE_PM]).input;

    expect(withoutSkipped(one, ONE_PM.id)).not.toHaveProperty('skipped');
  });

  it('are new conditions of the same value for a Class not in them, and for conditions of another kind, so that the recalculation sends the conversation’s list without it (P01 ticket 40)', () => {
    const events: PlanInput = { kind: 'events', date: '2026-11-17', eventIds: null };

    expect(withoutSkipped(TWO.input, 'another')).toEqual(TWO.input);
    expect(withoutSkipped(TWO.input, 'another')).not.toBe(TWO.input);
    expect(withoutSkipped(events, ONE_PM.id)).toEqual(events);
    expect(withoutSkipped(events, ONE_PM.id)).not.toBe(events);
  });
});
