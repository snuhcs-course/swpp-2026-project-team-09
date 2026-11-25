/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { linesOf, planCardRests } from '@/screens/main/answer/plan-card';

// What a Plan's card says and when it docks (P04 ticket 04), over the stored answer to "배고파, 민수랑 같이".
const PLAN = MEAL_ANSWER.plans[0] ?? null;
type Seen = Pick<ShownAnswer, 'plan' | 'moving' | 'ghost' | 'adding'>;

function shown(more: Partial<Seen> = {}): Seen {
  return { plan: PLAN, moving: null, ghost: null, adding: false, ...more };
}

describe("a Plan's card", () => {
  it('says no line at rest and docks', () => {
    expect(linesOf(shown(), MEAL_ANSWER)).toEqual([]);
    expect(planCardRests(shown(), MEAL_ANSWER, [])).toBe(true);
  });

  it('stays open for the whole drag of the band', () => {
    expect(planCardRests(shown({ moving: { startAt: '', endAt: '' } }), MEAL_ANSWER, [])).toBe(false);
  });
});
