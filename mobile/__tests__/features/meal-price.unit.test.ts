/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MealInput } from '@/api/assistant-types';
import type { PlanMenu } from '@/features/assistant/meal-menus';
import { MEAL_DINNER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { pricedAnswer } from '@/api/mock/data/meal-price-answer';
import { isInput } from '@/api/server/plan-inputs';
import {
  cheapestDish,
  conditionChipsOf,
  fitDishWords,
  overHeading,
  overPriceIds,
  pricedOrder,
  withoutCondition,
} from '@/features/assistant/meal-price';
import { listOrderWords } from '@/screens/main/answer/meal-list';

// A meal's price condition on the list and the map (P04 ticket 92; the main server's part is P05 ticket 53). The stored
// dinner: 302동식당 6,000원, 301동식당 5,000원, 학생회관식당 4,500원, 3식당 5,500원, 자하연식당 2층 7,000원.

const dish = (name: string, price: number | null): PlanMenu['dishes'][number] => ({ name, price, cuisine: null });

const asked = (condition: Pick<MealInput, 'maxPrice' | 'cheapFirst'>): AnswerReply & { input: MealInput } =>
  pricedAnswer(MEAL_DINNER_MENUS, condition);

// Partitions: the corner's own price, dishes that differ, a tie, and none. Expected values: the main server's
// `cheapestDish`, the dish the list's price speaks of.
describe('The dish whose price the list shows', () => {
  it.each<[string, PlanMenu, string, number]>([
    ["the corner's first dish at its own price", { price: 6500, dishes: [dish('뷔페', null)] }, '뷔페', 6500],
    [
      'the cheapest of dishes that differ',
      { price: null, dishes: [dish('돈까스', 6000), dish('라면', 3000)] },
      '라면',
      3000,
    ],
    [
      'the first of the cheapest',
      { price: null, dishes: [dish('돈까스', 6000), dish('제육덮밥', 5000), dish('비빔밥', 5000)] },
      '제육덮밥',
      5000,
    ],
  ])('is %s', (_, menu, name, price) => {
    expect(cheapestDish(menu)).toEqual({ name, price });
  });

  it('is none when nothing has a price', () => {
    expect(cheapestDish({ price: null, dishes: [dish('잔치국수', null)] })).toBeNull();
  });
});

// Partitions: a ceiling some fit, one none fits, cheapFirst alone, and no condition. Expected values: the ticket.
describe('What fits a price ceiling', () => {
  it('leaves the places over it apart when some are under it', () => {
    expect([...overPriceIds(asked({ maxPrice: 5000 }))].toSorted()).toEqual(['302동식당', '3식당', '자하연식당 2층']);
  });

  it('leaves none apart when none is under it, nor without a ceiling', () => {
    expect(overPriceIds(asked({ maxPrice: 3000 })).size).toBe(0);
    expect(overPriceIds(asked({ cheapFirst: true })).size).toBe(0);
    expect(overPriceIds(MEAL_DINNER_MENUS).size).toBe(0);
  });

  it("writes a fitting plan's dish and its price", () => {
    const [first] = asked({ maxPrice: 5000 }).plans;

    expect(first?.id).toBe('301동식당');
    expect(first === undefined ? null : fitDishWords(first)).toBe('짜장면 5,000원');
  });
});

// Partitions: a ceiling some fit, one none fits, cheapFirst alone, and no condition. Expected values: the ticket.
describe("The list's order with a price condition", () => {
  it("keeps the main server's order when it is by price", () => {
    expect(pricedOrder(asked({ cheapFirst: true }))).toBe(true);
    expect(pricedOrder(asked({ maxPrice: 3000 }))).toBe(true);
  });

  it('is the usual order with a ceiling some fit, and with no condition', () => {
    expect(pricedOrder(asked({ maxPrice: 5000 }))).toBe(false);
    expect(pricedOrder(MEAL_DINNER_MENUS)).toBe(false);
  });

  it('says 싼 순 when it is by price', () => {
    expect(listOrderWords(asked({ cheapFirst: true }))).toBe('싼 순');
    expect(listOrderWords(asked({ maxPrice: 3000 }))).toBe('싼 순');
  });
});

// Partitions: a ceiling, cheapFirst, both, and none. Expected values: the design page's chip words.
describe('The condition chips', () => {
  it('say the ceiling and the cheapest first, the ceiling first', () => {
    expect(conditionChipsOf(asked({ maxPrice: 5000, cheapFirst: true }))).toEqual([
      { condition: 'maxPrice', words: '5,000원 이하' },
      { condition: 'cheapFirst', words: '싼 순' },
    ]);
  });

  it('are none without a condition', () => {
    expect(conditionChipsOf(MEAL_DINNER_MENUS)).toEqual([]);
  });

  it('title the places over the ceiling', () => {
    expect(overHeading(5000)).toBe('5,000원 넘는 곳');
  });
});

// Partitions: each condition taken away, and the other kept. Expected values: the ticket.
describe("A condition chip's ✕", () => {
  const input: MealInput = { ...MEAL_DINNER_MENUS.input, maxPrice: 5000, cheapFirst: true };

  it('takes away its condition alone', () => {
    expect(withoutCondition(input, 'maxPrice')).toEqual({ ...MEAL_DINNER_MENUS.input, cheapFirst: true });
    expect(withoutCondition(input, 'cheapFirst')).toEqual({ ...MEAL_DINNER_MENUS.input, maxPrice: 5000 });
  });
});

// Partitions: both fields, and a ceiling that is no number. Expected values: the main server's input (P05 ticket 53).
describe("The app's check of a meal input with a price", () => {
  it('takes a ceiling and the cheapest first', () => {
    expect(isInput({ ...MEAL_DINNER_MENUS.input, maxPrice: 5000, cheapFirst: true })).toBe(true);
  });

  it('refuses a ceiling that is no number', () => {
    expect(isInput({ ...MEAL_DINNER_MENUS.input, maxPrice: '5000' })).toBe(false);
  });
});
