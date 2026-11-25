/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Plan } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { travelWords } from '@/features/assistant/answer-walks';
import { mealPickLabel, mealPickWords } from '@/features/assistant/meal-pick';
import { koreaClock } from '@/korea-time';

// The chosen place's label on a meal answer's map (P04 ticket 74): the name and the start, then the main dish and the
// main server's count of the other things served. Partitions: a count of two, of none, a menu without the count (a
// main server before the ticket), no menu, and a kind chosen.

const [first] = MEAL_ANSWER_MENUS.plans;
if (first === undefined) {
  throw new Error('The stored answer has Plans');
}

function withMenu(menu?: Plan['menu']): Plan {
  const { menu: _left, ...rest } = first;
  return menu === undefined ? rest : { ...rest, menu };
}

const HOTDOG = { name: '콘마요핫도그, 웨지감자튀김, 미니토마토파스타', price: null };

describe("the chosen place's label", () => {
  it('says the name and the start, with no walk, over the main dish and "외 N" of the others served', () => {
    const plan = withMenu({ price: 7000, dishes: [HOTDOG], others: 2 });
    const label = mealPickLabel(plan, '예술계식당', null);

    expect(label).toMatchObject({ title: '예술계식당', note: koreaClock(plan.startAt), line: '콘마요핫도그 외 2' });
    expect(`${label.note} ${label.line ?? ''}`).not.toMatch(/걸음|이동|원/u);
  });

  it('is read whole by a screen reader, walk and price included', () => {
    const plan = withMenu({ price: 7000, dishes: [HOTDOG], others: 2 });
    const way = travelWords(plan);

    expect(mealPickLabel(plan, '예술계식당', null).name).toBe(mealPickWords(plan, '예술계식당', null).name);
    expect(way).not.toBeNull();
    expect(mealPickLabel(plan, '예술계식당', null).name).toContain(way ?? '');
  });

  it('says the dish alone when nothing else is served', () => {
    expect(mealPickLabel(withMenu({ price: 7000, dishes: [HOTDOG], others: 0 }), '예술계식당', null).line).toBe(
      '콘마요핫도그',
    );
  });

  it('has no second line without a menu', () => {
    expect(mealPickLabel(withMenu(), '예술계식당', null).line).toBeNull();
  });

  it("keeps the menu's own words from a main server without the count", () => {
    const dishes = [
      { name: '뼈없는감자탕', price: 7000 },
      { name: '잡곡밥', price: null },
    ];

    expect(mealPickLabel(withMenu({ price: null, dishes }), '302동식당', null).line).toBe('뼈없는감자탕 외 1');
  });

  it('names the first dish of the kind on screen', () => {
    const dishes = [
      { name: '돈까스', price: 6000, cuisine: '일식' as const },
      { name: '김치찌개, 공기밥', price: 5000, cuisine: '한식' as const },
    ];

    expect(mealPickLabel(withMenu({ price: null, dishes, others: 3 }), '302동식당', '한식').line).toBe('김치찌개 외 3');
  });
});
