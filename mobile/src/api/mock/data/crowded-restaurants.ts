/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Cuisine } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';

// The eleven restaurants of the crowded meal answer (`crowded-meal.ts`) at their buildings' points; the menus and the
// prices are examples.

type Dish = [string, number | null, Cuisine | null];

export interface Restaurant {
  name: string;
  building: string;
  at: LatLng;
  opens: string;
  price: number | null;
  dishes: Dish[];
  // Reached from 301동 by the shuttle, as the shuttle-aware Plan sends it: its minutes and its stops' names.
  shuttle?: { minutes: number; boardAt: string; getOffAt: string };
}

export const B301 = { latitude: 37.45016, longitude: 126.95259 };
export const B302 = { latitude: 37.44887, longitude: 126.95265 };

export const RESTAURANTS: readonly Restaurant[] = [
  {
    name: '학생회관식당',
    building: '63',
    at: { latitude: 37.45932, longitude: 126.95058 },
    opens: '11:00',
    price: null,
    dishes: [
      ['목살슬라이스덮밥', 5500, '한식'],
      ['단호박영양밥', 4500, '한식'],
      ['천원의 식사', 1000, null],
    ],
  },
  {
    name: '302동식당',
    building: '302',
    at: B302,
    opens: '11:30',
    price: null,
    dishes: [
      ['순살안동식찜닭', 6500, '한식'],
      ['제육덮밥', 5000, '한식'],
      ['돈까스', 6000, '양식'],
    ],
  },
  {
    name: '301동식당',
    building: '301',
    at: B301,
    opens: '11:30',
    price: null,
    dishes: [
      ['들기름막국수와 김치메밀전병', 6500, '한식'],
      ['부대짬뽕&군만두와 찹쌀탕수육 반접시', 7000, '중식'],
    ],
  },
  {
    name: '3식당',
    building: '75-1',
    at: { latitude: 37.45647, longitude: 126.94851 },
    opens: '11:00',
    price: null,
    dishes: [
      ['오징어미나리무침', 5000, '한식'],
      ['돈까스카레', 6500, '일식'],
    ],
  },
  {
    name: '두레미담',
    building: '75-1',
    at: { latitude: 37.45647, longitude: 126.94851 },
    opens: '11:30',
    price: null,
    dishes: [
      ['제육덮밥', 6000, '한식'],
      ['매콤로제크림파스타와 마늘바게트', 7500, '양식'],
      ['김치찌개', 6000, '한식'],
      ['차돌된장찌개', 6500, '한식'],
      ['냉메밀', 6000, '일식'],
    ],
  },
  {
    name: '자하연식당 2층',
    building: '109',
    at: { latitude: 37.46098, longitude: 126.95252 },
    opens: '11:30',
    shuttle: { minutes: 13, boardAt: '301동', getOffAt: '자하연' },
    price: 6000,
    dishes: [
      ['낙지연포탕', null, '한식'],
      ['나가사키꼬치어묵', null, '일식'],
    ],
  },
  {
    name: '자하연식당 3층',
    building: '109',
    at: { latitude: 37.46098, longitude: 126.95252 },
    opens: '11:30',
    price: null,
    dishes: [
      ['수제등심돈까스정식', 7000, '양식'],
      ['우삼겹된장비빔밥', 6500, '한식'],
    ],
  },
  {
    name: '예술계식당',
    building: '74',
    at: { latitude: 37.46193, longitude: 126.95312 },
    opens: '11:30',
    price: null,
    dishes: [
      ['짜장면', 5000, '중식'],
      ['탕수육덮밥', 6000, '중식'],
    ],
  },
  {
    name: '감골식당',
    building: '101',
    at: { latitude: 37.46328, longitude: 126.95015 },
    opens: '14:50',
    price: 5500,
    dishes: [
      ['닭갈비볶음밥', null, '한식'],
      ['미역국', null, null],
    ],
  },
  {
    name: '동원관식당',
    building: '113',
    at: { latitude: 37.46504, longitude: 126.95175 },
    opens: '11:30',
    price: null,
    dishes: [
      ['떡볶이&튀김', 4500, '분식'],
      ['라면', 3500, '분식'],
    ],
  },
  {
    name: '기숙사식당 (관악사 919동)',
    building: '919',
    at: { latitude: 37.46306, longitude: 126.95872 },
    opens: '15:10',
    price: null,
    dishes: [
      ['함박스테이크와 감자튀김', 6500, '양식'],
      ['순두부찌개', 5500, '한식'],
    ],
  },
];
