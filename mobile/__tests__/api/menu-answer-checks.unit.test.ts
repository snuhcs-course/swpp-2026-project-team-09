/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MENU_ANSWER, MENU_CLOSED_LOOKUP } from '@/api/mock/data/menu-answer';
import { isLookup } from '@/api/server/lookup-answers';
import { isAnswerReply } from '@/api/server/plan-answers';

// The app's checks of a menu question's answer (P04 ticket 72): a meal answer with `opened`, which needs no check of its
// own (one that names no Plan opens nothing), and a Lookup's `menuView`.

// Partitions: the field absent, well formed, and of the wrong kind. Expected values: the mocks' answers.
describe("a menu question's answer", () => {
  it('passes the meal answer opened at its Restaurant, and one without `opened`', () => {
    const { opened: _opened, ...plain } = MENU_ANSWER;

    expect(isAnswerReply(MENU_ANSWER)).toBe(true);
    expect(isAnswerReply(plain)).toBe(true);
  });

  it("passes a closed Restaurant's Lookup with its menu view, and fails a view of a meal it never plans", () => {
    expect(isLookup(MENU_CLOSED_LOOKUP)).toBe(true);
    expect(isLookup({ ...MENU_CLOSED_LOOKUP, menuView: { ...MENU_CLOSED_LOOKUP.menuView, meal: 'breakfast' } })).toBe(
      false,
    );
    expect(isLookup({ ...MENU_CLOSED_LOOKUP, menuView: { restaurant: '학생회관식당' } })).toBe(false);
  });
});
