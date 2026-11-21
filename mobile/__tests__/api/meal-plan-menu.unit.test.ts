/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { isAnswerReply } from '@/api/server/plan-answers';

// A meal Plan carries its Restaurant's main corner, its own price and its dishes with theirs (P05 ticket 12), which the
// map writes on the Restaurant's tag and in the list of the candidates' menus (P04 tickets 13 and 15). The field is
// optional: a main server before it, a Restaurant with no menu collected, and every other Plan send none.

function withMenu(menu: unknown): unknown {
  const [first, ...rest] = MEAL_ANSWER.plans;
  return { ...MEAL_ANSWER, plans: [{ ...first, menu }, ...rest] };
}

describe("A meal Plan's menu", () => {
  it.each([
    ['with dishes and their prices', { price: null, dishes: [{ name: '눈꽃치즈닭갈비', price: 6000 }] }],
    ['of a buffet, priced once', { price: 6500, dishes: [{ name: '뼈없는감자탕', price: null }] }],
    ['with no dishes served', { price: null, dishes: [] }],
  ])('is believed %s', (_, menu) => {
    expect(isAnswerReply(withMenu(menu))).toBe(true);
  });

  it('may be absent', () => {
    expect(isAnswerReply(MEAL_ANSWER)).toBe(true);
  });

  it.each([
    ['without dishes', { price: null }],
    ['without its own price', { dishes: [] }],
    ['with a price as words', { price: null, dishes: [{ name: '수제탕수육', price: '6,000원' }] }],
    ['with a dish without a name', { price: null, dishes: [{ price: 6000 }] }],
  ])('is refused %s', (_, menu) => {
    expect(isAnswerReply(withMenu(menu))).toBe(false);
  });
});

// Each dish's kind of food (P05 ticket 15), from which the app makes its chips of kinds (P04 ticket 16).
const withDish = (dish: object): unknown =>
  withMenu({ price: null, dishes: [{ name: '부대짬뽕&군만두', price: 6500, ...dish }] });

describe("A meal Plan's dish", () => {
  it.each([
    ['with its kind of food', { cuisine: '중식' }],
    ['with no kind, as a side dish has', { cuisine: null }],
    ['without the field, from a main server before it', {}],
  ])('is believed %s', (_, dish) => {
    expect(isAnswerReply(withDish(dish))).toBe(true);
  });

  it.each([
    ['with a kind not of the five', { cuisine: '기타' }],
    ["with the server's word for it", { cuisine: 'chinese' }],
  ])('is refused %s', (_, dish) => {
    expect(isAnswerReply(withDish(dish))).toBe(false);
  });
});
