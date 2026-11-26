/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import { type AnswerSymbol, color } from '@/design-system';
import { drawingOf } from '@/features/assistant/answer-marks';
import { seen } from '../support/answer-marks';

// A meal answer's Restaurants in coral (P04 ticket 85, the user's "3안"): a flag of the meal's marks, not a change of
// the pick's role, so that every other answer's pick stays gold.

// Partitions: a meal answer with menus, its pick and its candidates, with a round of their own and without; an answer
// other than a meal's. Expected values: the ticket's decision.
// Every board's round symbols of a role: a pick on a Friend's spot shows the face, and its round is not drawn.
function rounds(answer: AnswerReply, role: 'pick' | 'candidate'): AnswerSymbol[] {
  return answer.plans.flatMap((_, index) =>
    drawingOf(answer, index).things.flatMap(({ look }) =>
      look.kind === 'answer' && look.symbol?.type === 'dot' && look.symbol.role === role ? [look.symbol] : [],
    ),
  );
}

describe("a meal answer's marks", () => {
  it('flag the chosen Restaurant and the numbered rounds as a meal’s', () => {
    const picks = rounds(MEAL_ANSWER_MENUS, 'pick');
    const candidates = rounds(MEAL_ANSWER_MENUS, 'candidate');

    expect(picks.length).toBeGreaterThan(0);
    expect(candidates.length).toBeGreaterThan(0);
    expect([...picks, ...candidates].every((symbol) => symbol.type === 'dot' && symbol.meal === true)).toBe(true);
    expect(seen(drawingOf(MEAL_ANSWER_MENUS, 0), 'answer:pick').label).toMatchObject({ tone: 'pick', note: '12:15' });
  });
});

describe("another answer's pick", () => {
  it('stays gold: a meet answer’s picks carry no meal flag', () => {
    const picks = rounds(MEET_ANSWER, 'pick');

    expect(picks.length).toBeGreaterThan(0);
    expect(picks.some((symbol) => 'meal' in symbol)).toBe(false);
  });
});

// Partitions: the two values, which equal the 식당 layer's coral since PR 572. Expected values: the orchestrator's brief.
describe('the meal colours', () => {
  it('are coral and its soft ground, the 식당 layer’s own', () => {
    expect([color.meal, color.mealSoft]).toEqual(['#C4452C', '#FCEBE6']);
    expect([color.svcDining, color.svcDiningSoft]).toEqual([color.meal, color.mealSoft]);
  });
});
