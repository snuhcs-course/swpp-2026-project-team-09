/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: each side of the next meal's four times; a pin for one restaurant, two at a Place and none; each
// menu line; the 7 days. Expected values: P15-01's criteria (iteration 1) and the restaurant table, in Korea's time.

import type { MenuLine, RestaurantMenus } from '@/api/menu-types';
import type { Place } from '@/api/types';
import { menuDays, nextMeal, toDiningCards, toMenuDay } from '@/features/dining/adapter';

const STUDENT_HALL: Place = { id: 'p63', number: '63', name: '학생회관', latitude: 37.4595, longitude: 126.9505 };
const JAHAYEON: Place = { id: 'p109', number: '109', name: '자하연식당', latitude: 37.4609, longitude: 126.9519 };

function dish(text: string): MenuLine {
  return { text, kind: 'dish', name: null, price: null };
}

function restaurant(
  name: string,
  meals: RestaurantMenus['meals'],
  collectedAt = '2026-10-05T20:00:00Z',
): RestaurantMenus {
  return { name, collectedAt, meals };
}

const LUNCH = [{ meal: 'lunch' as const, lines: [dish('카레')] }];
const LUNCH_AND_DINNER = [...LUNCH, { meal: 'dinner' as const, lines: [dish('국밥')] }];

describe('nextMeal', () => {
  it.each([
    ['00:00', '2026-10-06', 'breakfast'],
    ['09:59', '2026-10-06', 'breakfast'],
    ['10:00', '2026-10-06', 'lunch'],
    ['14:59', '2026-10-06', 'lunch'],
    ['15:00', '2026-10-06', 'dinner'],
    ['19:59', '2026-10-06', 'dinner'],
    ['20:00', '2026-10-07', 'breakfast'],
    ['23:59', '2026-10-07', 'breakfast'],
  ])('%s in Korea → %s %s', (clock, date, meal) => {
    expect(nextMeal(new Date(`2026-10-06T${clock}:00+09:00`))).toEqual({ date, meal });
  });
});

describe('toDiningCards', () => {
  it('one restaurant at its Place → a card with its name, its number and the meals served today', () => {
    const [card] = toDiningCards([restaurant('학생회관식당', LUNCH_AND_DINNER)], [STUDENT_HALL]);
    expect(card).toEqual({
      id: 'dining:p63',
      kind: 'dining',
      mark: { type: 'place', place: 'dining' },
      marker: { name: '식당 · 학생회관식당', short: '학생회관식당', count: 0, minutesOld: null },
      subLabel: '식당 · 학식 · 63동',
      title: '학생회관식당',
      lines: [
        { icon: 'pin', text: '63동' },
        { icon: 'meal', text: '오늘 점심 · 저녁' },
      ],
      primary: { label: '메뉴 보기', action: 'menu', restaurant: '학생회관식당' },
      secondary: null,
      position: { latitude: 37.4595, longitude: 126.9505 },
    });
  });

  it("two restaurants at one Place → one card under the Place's name, a line for each", () => {
    const menus = [restaurant('자하연식당 2층', LUNCH), restaurant('자하연식당 3층', LUNCH_AND_DINNER)];
    const cards = toDiningCards(menus, [JAHAYEON]);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      marker: { short: '자하연식당 2층 외 1곳' },
      title: '자하연식당',
      lines: [
        { icon: 'pin', text: '109동' },
        { icon: 'meal', text: '자하연식당 2층 · 오늘 점심' },
        { icon: 'meal', text: '자하연식당 3층 · 오늘 점심 · 저녁' },
      ],
      primary: { restaurant: '자하연식당 2층' },
    });
  });

  it.each([
    ['a restaurant without lines today', [restaurant('학생회관식당', [])], [STUDENT_HALL]],
    [
      'a restaurant with only empty meals',
      [restaurant('학생회관식당', [{ meal: 'lunch', lines: [] }])],
      [STUDENT_HALL],
    ],
    ['a restaurant outside the table', [restaurant('새 식당', LUNCH)], [STUDENT_HALL]],
    ['a restaurant whose Place is not answered', [restaurant('학생회관식당', LUNCH)], [JAHAYEON]],
  ])('%s → no pin', (_, menus, places) => {
    expect(toDiningCards(menus, places)).toEqual([]);
  });
});

describe('toMenuDay', () => {
  const lines: MenuLine[] = [
    { text: '정식 6000원', kind: 'heading', name: null, price: null },
    { text: '제육볶음 6000원', kind: 'dish', name: '제육볶음', price: 6000 },
    { text: '스페셜 12500원', kind: 'dish', name: '스페셜', price: 12_500 },
    { text: '김치', kind: 'dish', name: '김치', price: null },
    { text: '11:00-14:00', kind: 'note', name: null, price: null },
    { text: '샐러드바', kind: null, name: null, price: null },
  ];

  it('each kind of line → a priced row, a heading, a note or plain words', () => {
    const { restaurants } = toMenuDay([restaurant('학생회관식당', [{ meal: 'lunch', lines }])]);
    expect(restaurants[0]?.meals.lunch).toEqual([
      { type: 'heading', text: '정식 6000원' },
      { type: 'priced', name: '제육볶음', price: '6,000원' },
      { type: 'priced', name: '스페셜', price: '12,500원' },
      { type: 'plain', text: '김치' },
      { type: 'note', text: '11:00-14:00' },
      { type: 'plain', text: '샐러드바' },
    ]);
  });

  it('a restaurant in the table and one outside it → its number, and none', () => {
    const { restaurants } = toMenuDay([restaurant('두레미담', LUNCH), restaurant('새 식당', [])]);
    expect(restaurants.map(({ name, place }) => [name, place])).toEqual([
      ['두레미담', '75-1동'],
      ['새 식당', null],
    ]);
    expect(restaurants[1]?.meals).toEqual({ breakfast: [], lunch: [], dinner: [] });
  });

  it("restaurants collected at different times → the oldest collection, in Korea's time", () => {
    const menus = [
      restaurant('학생회관식당', LUNCH, '2026-10-05T21:30:00Z'),
      restaurant('두레미담', LUNCH, '2026-10-05T20:05:00Z'),
    ];
    expect(toMenuDay(menus).collected).toBe('10월 6일 05:05에 가져온 메뉴예요');
  });

  it('an empty day → no restaurant and no collection line', () => {
    expect(toMenuDay([])).toEqual({ restaurants: [], collected: '' });
  });
});

describe('menuDays', () => {
  it('late on Tuesday 6 October in Korea → 오늘, 내일, then the weekdays to Monday the 12th', () => {
    const days = menuDays(new Date('2026-10-06T23:30:00+09:00'));
    expect(days.map(({ key, top, date }) => [key, top, date])).toEqual([
      ['2026-10-06', '오늘', 6],
      ['2026-10-07', '내일', 7],
      ['2026-10-08', '목', 8],
      ['2026-10-09', '금', 9],
      ['2026-10-10', '토', 10],
      ['2026-10-11', '일', 11],
      ['2026-10-12', '월', 12],
    ]);
    expect(days[0]).toMatchObject({ weekday: 2, label: '10월 6일 화요일' });
    expect(days[5]).toMatchObject({ weekday: 0, label: '10월 11일 일요일' });
  });
});
