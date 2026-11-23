/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { candidateRowsOf, listOrderWords } from '@/screens/main/answer/meal-list';

// The raised meal list's order when where the User starts is unknown (the orchestrator's rule of 2026-11-23): the main
// server's, whatever minutes the rows show, with its caption.

// Partitions: where the User starts unknown, with a way on to the next item (P05 ticket 45's order, PR 515's walking).
describe('the list with a way on alone', () => {
  // The server's order, its pick first, which is not the least way on.
  const plans = [2, 0, 1].flatMap((at) => MEAL_ANSWER_MENUS.plans[at] ?? []);
  const unknownStart = {
    ...MEAL_ANSWER_MENUS,
    plans: plans.map((plan, at) => ({
      ...plan,
      parts: plan.parts.map((part) => (part.me ? { ...part, origin: null, walkMinutes: null } : part)),
      scene: {
        ...plan.scene,
        routes: [
          ...plan.scene.routes.filter(({ role }) => role !== 'next'),
          { userId: 'me', role: 'next' as const, from: plan.place, to: plan.place, minutes: 20 - 5 * at },
        ],
      },
    })),
  };

  it('keeps the main server’s order whatever minutes the rows show, and the caption says 추천 순', () => {
    const rows = candidateRowsOf(unknownStart);

    expect(rows.map(({ planId }) => planId)).toEqual(plans.map(({ id }) => id));
    expect(rows.map(({ when }) => when)).toEqual(['걸음 20분', '걸음 15분', '걸음 10분']);
    expect(listOrderWords(unknownStart)).toBe('추천 순');
  });
});
