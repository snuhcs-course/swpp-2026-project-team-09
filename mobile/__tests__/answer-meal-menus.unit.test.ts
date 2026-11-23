/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MenuLine, RestaurantMenus } from '@/api/menu-types';
import { MEAL_ANSWER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { cornersOf, hoursOf, planCorner } from '@/features/assistant/meal-menus';
import { crowdedMealAnswer, crowdedWithFriend } from '@/api/mock/data/crowded-meal';
import { travelWords } from '@/features/assistant/answer-walks';
import { mealPickWords } from '@/features/assistant/meal-pick';
import {
  candidateRowsOf,
  droppedHeading,
  listedCount,
  listOrderWords,
  mealCard,
  walksKnown,
} from '@/screens/main/answer/meal-list';
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

  it('lists one candidate alone as one row, which the caption counts as 1', () => {
    const answer = { ...MEAL_ANSWER_MENUS, plans: MEAL_ANSWER_MENUS.plans.slice(0, 1) };

    expect(mealCard(answer)).toBe(true);
    expect(listedCount(answer)).toBe(1);
    expect(candidateRowsOf(answer)).toHaveLength(1);
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

// Partitions: one Plan kept of three, with a Friend and without; the crowded answer's late restaurants.
describe('one Plan kept of many', () => {
  const [first, ...rest] = MEAL_ANSWER_MENUS.plans.slice(0, 3);
  const dropped = rest.map(({ place }) => ({ place, reason: '김민수는 10분밖에 못 있어요' }));
  const kept = { ...MEAL_ANSWER_MENUS, plans: first === undefined ? [] : [first], dropped };

  it('is still listed, counting only the place offered, as the list’s first line does', () => {
    expect(mealCard(kept)).toBe(true);
    expect(listedCount(kept)).toBe(1);
  });

  it('names the Friend whose time the places dropped do not fit, and says the one place alone fits', () => {
    expect(droppedHeading(kept)).toBe('김민수와 시간이 맞지 않는 곳');
    const shown = { answer: kept, source: kept, index: 0, plan: first ?? null };
    expect(mealDockLine('', shown)).toMatch(/^김민수와 시간이 맞는 곳은 302동식당뿐이에요 · \d{2}:\d{2}/u);
  });

  it('says only the time without a Friend', () => {
    const alone = { ...kept, chips: kept.chips.filter(({ kind }) => kind !== 'person') };
    expect(droppedHeading(alone)).toBe('시간이 맞지 않는 곳');
  });
});

describe('the crowded answer’s late restaurants', () => {
  it('fades only those that cannot be done before the next Class, however far the rest are', () => {
    const rows = candidateRowsOf(crowdedMealAnswer('2026-10-07', '2026-10-06T04:00:00Z'));

    expect(
      rows
        .filter(({ faded }) => faded)
        .map(({ name }) => name)
        .toSorted(),
    ).toEqual(['감골식당', '기숙사식당 (관악사 919동)']);
    expect(rows.some(({ walk, faded }) => (walk ?? 0) > 30 && !faded)).toBe(true);
  });
});

// Partitions: every leg on foot, as a reply without `mode` reads; the way there by shuttle, as the shuttle-aware Plan
// sends it (`mode: 'shuttle'` and the stops' names).
describe('the words of the way', () => {
  const plan = crowdedMealAnswer('2026-10-07', '2026-10-06T04:00:00Z').plans.find(
    ({ place }) => place.label === '학생회관식당',
  );
  if (plan === undefined) {
    throw new Error('The crowded answer has Plans');
  }
  const byShuttle = {
    ...plan,
    parts: plan.parts.map((part) =>
      part.me ? { ...part, mode: 'shuttle' as const, shuttle: { boardAt: '301동', getOffAt: '경영대' } } : part,
    ),
  };

  it('says 걸음 where every leg is on foot, as a reply without `mode` reads', () => {
    expect(travelWords(plan)).toMatch(/^걸음 \d+분$/u);
    expect(mealPickWords(plan, plan.place.label, null).note).toMatch(/ · 걸음 \d+분$/u);
  });

  it('says 이동 with 셔틀, and never 걸음, where a leg is by shuttle', () => {
    expect(travelWords(byShuttle)).toMatch(/^이동 \d+분 · 셔틀$/u);
    expect(mealPickWords(byShuttle, plan.place.label, null).note).not.toContain('걸음');
    const rows = candidateRowsOf({ ...MEAL_ANSWER_MENUS, plans: [byShuttle, ...MEAL_ANSWER_MENUS.plans.slice(1, 2)] });
    expect(rows.find(({ planId }) => planId === byShuttle.id)?.when).toMatch(/^이동 \d+분 · 셔틀$/u);
  });
});

// Partitions: a Friend's name ending in a final consonant (강도윤) in the crowded mock's reasons.
describe('the crowded mock with a Friend', () => {
  it('gives every reason the topic particle the main server gives: 은 after 윤', () => {
    const reasons = crowdedWithFriend('2026-10-07', '2026-10-06T04:00:00Z', 'f6').dropped.map(({ reason }) => reason);

    expect(reasons.filter((reason) => reason.startsWith('강도윤'))).not.toHaveLength(0);
    expect(reasons.every((reason) => !reason.startsWith('강도윤는'))).toBe(true);
  });
});

// Partitions: no starting place and no way on, so no walking for any Plan (P05 ticket 40's order); walking known.
describe('the list without walking', () => {
  // The server's order, which is not the order of arrival: the third candidate first.
  const plans = [2, 0, 1].flatMap((at) => MEAL_ANSWER_MENUS.plans[at] ?? []);
  const unknown = {
    ...MEAL_ANSWER_MENUS,
    plans: plans.map((plan) => ({
      ...plan,
      parts: plan.parts.map((part) => (part.me ? { ...part, origin: null, walkMinutes: null } : part)),
      scene: { ...plan.scene, routes: plan.scene.routes.filter(({ role }) => role !== 'next') },
    })),
  };

  it('keeps the main server’s order, says arrivals, and the caption says 일찍 여는 순', () => {
    const rows = candidateRowsOf(unknown);

    expect(walksKnown(unknown)).toBe(false);
    expect(rows.map(({ planId }) => planId)).toEqual(plans.map(({ id }) => id));
    expect(rows.every(({ when }) => /^\d{2}:\d{2} 도착$/u.test(when))).toBe(true);
    expect(listOrderWords(unknown)).toBe('일찍 여는 순');
  });

  it('orders by walking with walking known, and the caption says 걸음이 적은 순', () => {
    const known = { ...MEAL_ANSWER_MENUS, plans };
    const walks = candidateRowsOf(known).map(({ walk }) => walk ?? Infinity);

    expect(walksKnown(known)).toBe(true);
    expect(walks).toEqual(walks.toSorted((one, other) => one - other));
    expect(listOrderWords(known)).toBe('걸음이 적은 순');
  });
});
