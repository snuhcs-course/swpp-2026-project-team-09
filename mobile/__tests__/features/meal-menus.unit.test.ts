/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { menuLine, type PlanMenu } from '@/features/assistant/meal-menus';

// A candidate's second line (P04 ticket 13, board 22): its first dish, the count of the rest, and its price.

function menu(price: number | null, ...dishes: [string, number | null][]): PlanMenu {
  return { price, dishes: dishes.map(([name, dishPrice]) => ({ name, price: dishPrice })) };
}

// Partitions: no menu, no dishes, one dish, several dishes; prices all missing, one, equal, different, the corner's.
describe("a candidate's second line", () => {
  it('is none without a menu or without dishes', () => {
    expect(menuLine(MEAL_ANSWER.plans[0]?.menu)).toBeNull();
    expect(menuLine(menu(null))).toBeNull();
  });

  it('names the first dish, the count of the rest, and the lowest price "부터" when prices differ', () => {
    expect(menuLine(menu(null, ['뚝배기불고기', 6500], ['김치찌개', 5000], ['야채비빔밥', 5000]))).toBe(
      '뚝배기불고기 외 2 · 5,000원부터',
    );
  });

  it('names one dish with its price', () => {
    expect(menuLine(menu(null, ['돼지고기짜글이찌개', 6500]))).toBe('돼지고기짜글이찌개 · 6,500원');
  });

  it('says one price without "부터" when every dish costs the same', () => {
    expect(menuLine(menu(null, ['우거지장터국밥', 7000], ['순두부찌개', 7000]))).toBe('우거지장터국밥 외 1 · 7,000원');
  });

  it('leaves out a dish without a price, and the price when no dish has one', () => {
    expect(menuLine(menu(null, ['오므라이스', null], ['김치찌개', 5000], ['돈까스', 6000]))).toBe(
      '오므라이스 외 2 · 5,000원부터',
    );
    expect(menuLine(menu(null, ['오므라이스', null], ['카레', null]))).toBe('오므라이스 외 1');
  });

  it("says a buffet's own price once", () => {
    expect(menuLine(menu(6500, ['나가사키꼬치어묵', null], ['닭볶음탕', null]))).toBe(
      '나가사키꼬치어묵 외 1 · 6,500원',
    );
  });
});
