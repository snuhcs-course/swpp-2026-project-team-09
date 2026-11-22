/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MenuLine, RestaurantMenus } from '@/api/menu-types';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { cornersOf, hoursOf, planCorner } from '@/features/assistant/meal-menus';
import { candidateRowsOf, mealListed } from '@/screens/main/answer/meal-list';
import { mealTabsOf, restaurantOf } from '@/screens/main/answer/meal-menu';
import { mealDockLine, mealSentenceOf } from '@/screens/main/answer/meal-dock';

// A restaurant's menu as corners (board E4) and the list of candidates (board E3). Partitions: a menu of a priced
// corner, one of dishes ordered one by one, and lines before any heading; hours in a note, and none; the list's order,
// its kind, and an answer of one candidate.

function dish(name: string, price: number): MenuLine {
  return { text: `${name} : ${String(price)}원`, kind: 'dish', name, price };
}

function plain(text: string): MenuLine {
  return { text, kind: null, name: null, price: null };
}

function heading(text: string, price: number | null = null): MenuLine {
  return { text, kind: 'heading', name: null, price };
}

function note(text: string): MenuLine {
  return { text, kind: 'note', name: null, price: null };
}

describe('the corners of a menu', () => {
  it('serves a priced corner in one line and orders each priced dish on its own', () => {
    const lines = [
      heading('<셀프코너> 7,000원', 7000),
      plain('잡곡밥'),
      plain('뼈없는감자탕'),
      heading('<주문식 메뉴>'),
      dish('고등어 소금구이', 14000),
      dish('철판제육볶음', 15000),
      note('※ 운영시간 : 11:30~13:30'),
    ];

    expect(cornersOf(lines)).toEqual([
      { title: '셀프코너', price: 7000, served: ['잡곡밥', '뼈없는감자탕'], ordered: [] },
      {
        title: '주문식 메뉴',
        price: null,
        served: [],
        ordered: [
          { name: '고등어 소금구이', price: 14000 },
          { name: '철판제육볶음', price: 15000 },
        ],
      },
    ]);
  });

  it('keeps the lines before any heading in a corner without a title', () => {
    expect(cornersOf([dish('돈까스', 6000), plain('카레라이스')])).toEqual([
      { title: null, price: null, served: ['카레라이스'], ordered: [{ name: '돈까스', price: 6000 }] },
    ]);
  });
});

describe('the hours and a Plan’s own menu', () => {
  it('reads the hours of a note, and none without one', () => {
    expect(hoursOf([note('※운영시간: 11:30~13:30')])).toBe('11:30–13:30');
    expect(hoursOf([plain('카레라이스')])).toBeNull();
  });

  it('makes one corner of a Plan’s own menu', () => {
    expect(
      planCorner({
        price: null,
        dishes: [
          { name: '라면', price: 3500 },
          { name: '김치', price: null },
        ],
      }),
    ).toEqual({
      title: null,
      price: null,
      served: ['김치'],
      ordered: [{ name: '라면', price: 3500 }],
    });
  });
});

describe('the meals of a restaurant’s day', () => {
  const restaurant: RestaurantMenus = {
    name: '302동식당',
    placeId: 'place-302',
    collectedAt: '2026-09-30T20:00:00.000Z',
    meals: [
      { meal: 'lunch', lines: [plain('뼈없는감자탕'), note('※운영시간: 11:30~13:30')] },
      { meal: 'dinner', lines: [plain('카레라이스')] },
    ],
  };

  it('names each with its hours when a note gives them', () => {
    expect(mealTabsOf(restaurant).map(({ words }) => words)).toEqual(['점심 11:30–13:30', '저녁']);
  });

  it('finds the restaurant by the Plan’s name', () => {
    const [plan] = MEAL_ANSWER_MENUS.plans;
    if (plan === undefined) {
      throw new Error('The stored answer has Plans');
    }
    expect(restaurantOf([restaurant], { ...plan, place: { ...plan.place, label: '302동식당' } })).toBe(restaurant);
    expect(
      restaurantOf([restaurant], { ...plan, place: { ...plan.place, label: '없는 식당', placeId: 'x' } }),
    ).toBeNull();
  });
});

describe('the list of candidates', () => {
  it('orders them by the walking they add, the least first', () => {
    const rows = candidateRowsOf(MEAL_ANSWER_MENUS);
    const walks = rows.map(({ walk }) => walk ?? Infinity);

    expect(rows).toHaveLength(MEAL_ANSWER_MENUS.plans.length);
    expect(walks).toEqual(walks.toSorted((one, other) => one - other));
    expect(rows[0]?.when).toMatch(/^걸음 \d+분$/u);
  });

  it('keeps only those of the kind on screen', () => {
    const answer = { ...MEAL_ANSWER_MENUS, input: { ...MEAL_ANSWER_MENUS.input, cuisine: '일식' as const } };

    expect(candidateRowsOf(answer)).toHaveLength(2);
  });

  it('lists nothing for one candidate', () => {
    const answer = { ...MEAL_ANSWER_MENUS, plans: MEAL_ANSWER_MENUS.plans.slice(0, 1) };

    expect(mealListed(answer)).toBe(false);
    expect(candidateRowsOf(answer)).toEqual([]);
  });
});

describe('the dock’s sentence', () => {
  it('is the Assistant’s words in one paragraph without markdown', () => {
    expect(mealSentenceOf('**학생회관식당**은 걸음 32분이에요.\n가까운 302동식당은 걸음 2분.')).toBe(
      '학생회관식당은 걸음 32분이에요. 가까운 302동식당은 걸음 2분.',
    );
  });
});

// Partitions: the sentence about the pick on screen; the stand-in; another place chosen (review of PR 477).
describe('the dock’s line', () => {
  const shown = {
    answer: MEAL_ANSWER_MENUS,
    source: MEAL_ANSWER_MENUS,
    index: 0,
    plan: MEAL_ANSWER_MENUS.plans[0] ?? null,
  };

  it('is the Assistant’s sentence while the first pick is on screen', () => {
    expect(mealDockLine('302동식당이 좋아요.', shown)).toBe('302동식당이 좋아요.');
  });

  it('is the chosen place’s own line without the model’s words', () => {
    expect(mealDockLine('아래에서 확인해 보세요.', shown)).toMatch(/^302동식당 · 12:15 · /u);
  });

  it('is the chosen place’s own line once another is chosen', () => {
    const second = { ...shown, index: 1, plan: MEAL_ANSWER_MENUS.plans[1] ?? null };

    expect(mealDockLine('302동식당이 좋아요.', second)).toMatch(/^301동식당 · /u);
  });
});
