/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MenuLine, RestaurantMenus } from '@/api/menu-types';
import type { Place } from '@/api/types';
import type { FakeServer } from './fake-server';

// The main server's menus of 6 October 2026 and its Places, as the tests of the dining views set them.

export const NOODLES: MenuLine = {
  text: '눈꽃치즈닭갈비 : 6,000원',
  kind: 'dish',
  name: '눈꽃치즈닭갈비',
  price: 6000,
};
export const BUFFET: MenuLine = { text: '<뷔페> 6,500원', kind: 'heading', name: null, price: 6500 };
export const HOURS: MenuLine = { text: '※운영시간: 11:30~13:30', kind: 'note', name: null, price: null };
export const STEW: MenuLine = { text: '뼈없는감자탕', kind: null, name: null, price: null };
export const NO_PRICE: MenuLine = { text: '한입버거 : 9,900원 / 12,400원', kind: 'dish', name: null, price: null };

function restaurant(
  name: string,
  meals: RestaurantMenus['meals'],
  collectedAt = '2026-10-05T20:00:00.000Z',
): RestaurantMenus {
  return { name, collectedAt, meals };
}

export const TODAY_MENUS: RestaurantMenus[] = [
  restaurant('302동식당', [{ meal: 'lunch', lines: [BUFFET, STEW, HOURS] }]),
  restaurant('교수회관식당', [{ meal: 'lunch', lines: [NO_PRICE] }]),
  // Collected the evening before, the oldest of the day.
  restaurant('수의대식당', [{ meal: 'lunch', lines: [{ ...STEW, text: '카레라이스' }] }], '2026-10-05T11:00:00.000Z'),
  restaurant('예술계식당', []),
  restaurant('자하연식당 2층', [
    {
      meal: 'lunch',
      lines: [{ ...NOODLES, text: '나가사키꼬치어묵 : 5,500원', name: '나가사키꼬치어묵', price: 5500 }],
    },
  ]),
  restaurant('자하연식당 3층', [{ meal: 'dinner', lines: [{ ...HOURS, text: '※ 저녁 단체예약문의: 02-880-7889' }] }]),
  restaurant('학생회관식당', [
    { meal: 'lunch', lines: [NOODLES] },
    { meal: 'dinner', lines: [{ ...NOODLES, text: '갈비구이 : 6,000원', name: '갈비구이' }] },
  ]),
];

function place(id: string, number: string | null, name: string, latitude: number, longitude: number): Place {
  return { id, number, name, latitude, longitude };
}

// 수의과대학 (85) is left out: 수의대식당 has no Place.
export const PLACES: Place[] = [
  place('p63', '63', '학생회관', 37.45932, 126.95058),
  place('p74', '74', '예술복합연구동', 37.46193, 126.95312),
  place('p109', '109', '자하연식당', 37.46098, 126.95252),
  place('p302', '302', '제2공학관', 37.44887, 126.95265),
];

export const STUDENT_CENTRE = '식당 · 학생회관식당';
export const JAHAYEON = '식당 · 자하연식당 2층 외 1곳';
export const ENGINEERING = '식당 · 302동식당';

// `GET /menus` answers TODAY_MENUS for 6 October, and [] for any other day; `GET /places` answers PLACES.
export function answerDining(server: FakeServer): void {
  server.on('GET /menus', ({ query }) => ({ status: 200, body: query.date === '2026-10-06' ? TODAY_MENUS : [] }));
  server.on('GET /places', { status: 200, body: PLACES });
}
