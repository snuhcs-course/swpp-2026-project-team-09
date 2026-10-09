/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Meal, MenuLine, RestaurantMenus } from '@/api/menu-types';

// The menus of the week from the mocks' day, 1 October 2026, made of lines of the pages the worker server's tests keep
// (`worker-server/test/pages/`). 3 October is a holiday with a closure, and Sunday 4 October has no menu.

function dish(name: string, price: number): MenuLine {
  const won = String(price).replaceAll(/\B(?=(?:\d{3})+$)/gu, ',');
  return { text: `${name} : ${won}원`, kind: 'dish', name, price };
}

function heading(text: string, price: number | null = null): MenuLine {
  return { text, kind: 'heading', name: null, price };
}

function note(text: string): MenuLine {
  return { text, kind: 'note', name: null, price: null };
}

function plain(text: string): MenuLine {
  return { text, kind: null, name: null, price: null };
}

function restaurant(name: string, meals: Partial<Record<Meal, MenuLine[]>>): RestaurantMenus {
  const order: Meal[] = ['breakfast', 'lunch', 'dinner'];
  return {
    name,
    collectedAt: '2026-09-30T20:00:00.000Z',
    meals: order.flatMap((meal) => {
      const lines = meals[meal];
      return lines === undefined ? [] : [{ meal, lines }];
    }),
  };
}

const STUDENT_CENTRE_LUNCH = [
  dish('눈꽃치즈닭갈비', 6000),
  dish('단호박영양밥&양념장(#)', 3000),
  dish('수제탕수육', 6000),
  note('※ 운영시간 : 11:00~14:30'),
  note('※ 혼잡시간 : 11:50~12:20'),
];

function day(holiday: boolean): RestaurantMenus[] {
  return [
    restaurant('302동식당', {
      lunch: [
        heading('<뷔페> 6,500원', 6500),
        plain('뼈없는감자탕'),
        plain('미트볼굴소스조림'),
        plain('참깨소스냉두부'),
        note('※운영시간: 11:30~13:30'),
      ],
    }),
    restaurant('동원관식당', {
      lunch: [dish('돈까스김치치즈나베', 6000), dish('고추장숙주불고기', 6000), note('※ 운영시간 : 11:00~14:00')],
    }),
    restaurant('두레미담', {
      lunch: [
        heading('<셀프코너> 7,000원', 7000),
        plain('잡곡밥'),
        plain('뼈없는감자탕'),
        heading('<주문식 메뉴>'),
        dish('고등어 소금구이', 14000),
        dish('철판제육볶음', 15000),
      ],
    }),
    restaurant('수의대식당', { lunch: [plain('카레라이스')] }),
    restaurant('아워홈(901동)', {
      breakfast: [
        dish('세미양식부페', 5000),
        plain('브로콜리스프/아욱국,고기산적조림,계란후라이,토스트,씨리얼, 흰우유/두유,그린샐러드'),
        note('※운영시간 : 08:00~09:30'),
      ],
    }),
    restaurant('예술계식당', {}),
    restaurant('자하연식당 2층', {
      lunch: [dish('나가사키꼬치어묵', 5500), note('※ 운영시간 : 11:30~14:00')],
      dinner: [dish('뼈없는닭갈비', 6000), note('※ 운영시간 : 17:00~18:30')],
    }),
    restaurant('자하연식당 3층', {
      lunch: [dish('동태매운탕(#)', 13000), heading('<+세미뷔페>'), plain('오징어다시마숙회'), plain('단호박튀김')],
      dinner: [note('※ 저녁 단체예약문의: 02-880-7889')],
    }),
    restaurant('학생회관식당', {
      breakfast: [dish('쇠고기채소찌개', 3000), note('※ 운영시간 : 08:00~10:00')],
      lunch: holiday ? [note('개천절 휴무')] : STUDENT_CENTRE_LUNCH,
      dinner: [dish('갈비구이', 6000), dish('꽁치무조림(#)', 3000), note('※ 운영시간 : 17:00~19:00')],
    }),
  ];
}

export const MENUS: Record<string, RestaurantMenus[]> = {
  '2026-10-01': day(false),
  '2026-10-02': day(false),
  '2026-10-03': day(true),
  '2026-10-04': [],
  '2026-10-05': day(false),
  '2026-10-06': day(false),
  '2026-10-07': day(false),
};
