/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, MapScene, MealInput, Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { B301, B302, type Restaurant, RESTAURANTS } from './crowded-restaurants';
import { ME } from './frame';

// The crowded meal answer, for checking the map with real data (the answer screen's redesign, 2026-11-22): "내일 점심
// 뭐 먹을까" answered tomorrow with eleven restaurants at their buildings' points, two of them sharing 109동 and two
// 75-1동, between a Class ending at 301동 at 10:45 and one at 302동 at 15:30. Long names and long dish names are among
// them. The walks are worked out from the straight distance; the menus and prices are examples.

export const CROWDED_ASKED = '내일 점심 뭐 먹을까';

const EARTH = 6_371_000;
// A walk on campus, by the straight distance with a tenth more for the paths.
const PER_MINUTE = 75;
const PATHS = 1.1;
const ONE_POINT = 15;

function metres(one: LatLng, other: LatLng): number {
  const rad = Math.PI / 180;
  const north = (other.latitude - one.latitude) * rad * EARTH;
  const east = (other.longitude - one.longitude) * rad * EARTH * Math.cos(one.latitude * rad);
  return Math.hypot(north, east);
}

function minutes(one: LatLng, other: LatLng): number {
  return Math.round((metres(one, other) * PATHS) / PER_MINUTE);
}

function clockMinutes(clock: string): number {
  const [hour = 0, minute = 0] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

function at(date: string, total: number): string {
  const hour = String(Math.floor(total / 60)).padStart(2, '0');
  const minute = String(total % 60).padStart(2, '0');
  return `${date}T${hour}:${minute}:00+09:00`;
}

function clockOf(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const CLASS_END = clockMinutes('10:45');
const NEXT_CLASS = clockMinutes('15:30');
const EATING = 40;

function point(place: { name: string; building: string; at: LatLng }): {
  placeId: string;
  label: string;
  latitude: number;
  longitude: number;
} {
  return { placeId: `place-${place.building}`, label: place.name, ...place.at };
}

const START = point({ name: '301동', building: '301', at: B301 });
const NEXT = point({ name: '302동', building: '302', at: B302 });

function scene(chosen: Restaurant, there: number, on: number): MapScene {
  const routes: MapScene['routes'] = [];
  if (metres(B301, chosen.at) > ONE_POINT) {
    routes.push({ userId: ME.id, role: 'me', from: B301, to: chosen.at, minutes: there });
  }
  if (metres(chosen.at, B302) > ONE_POINT) {
    routes.push({ userId: ME.id, role: 'next', from: chosen.at, to: B302, minutes: on });
  }
  return {
    people: [{ userId: ME.id, name: ME.name, me: true, at: B301, source: 'timetable', tag: '나' }],
    places: [
      ...RESTAURANTS.map((one) => ({
        place: point(one),
        role: one === chosen ? ('pick' as const) : ('candidate' as const),
        tag: one.name,
      })),
      { place: NEXT, role: 'next' as const, tag: '15:30 수업 · 302동' },
    ],
    routes,
    flags: [],
  };
}

function bandOf(date: string, now: string, start: number, end: number): Plan['band'] {
  return {
    range: { startAt: at(date, CLASS_END - 15), endAt: at(date, NEXT_CLASS + 15) },
    now,
    lanes: [
      {
        userId: ME.id,
        name: '나',
        busy: [
          { startAt: at(date, CLASS_END - 15), endAt: at(date, CLASS_END), label: '301동 수업' },
          { startAt: at(date, NEXT_CLASS), endAt: at(date, NEXT_CLASS + 15), label: '302동 수업' },
        ],
      },
    ],
    startAt: at(date, start),
    endAt: at(date, end),
    text: `${clockOf(start)}–${clockOf(end)} · 식사 ${String(EATING)}분`,
  };
}

function planOf(date: string, now: string, one: Restaurant): Plan {
  const there = minutes(B301, one.at);
  const on = minutes(one.at, B302);
  const start = Math.max(CLASS_END + there, clockMinutes(one.opens));
  const end = start + EATING;
  const time = clockOf(start);
  return {
    id: one.name,
    title: `${one.name}에서 점심`,
    place: point(one),
    startAt: at(date, start),
    endAt: at(date, end),
    togetherMinutes: EATING,
    meeting: null,
    parts: [
      {
        userId: ME.id,
        name: ME.name,
        me: true,
        origin: { place: START, basis: 'timetable' },
        leaveAt: at(date, start - there),
        walkMinutes: there,
        arriveAt: at(date, CLASS_END + there),
        leaveBy: at(date, NEXT_CLASS - on),
        next: { startAt: at(date, NEXT_CLASS), place: NEXT },
      },
    ],
    subQuests: [{ at: at(date, start), placeId: `place-${one.building}`, title: `${one.name}에서 식사` }],
    lines: [
      [
        { text: '점심 ', strong: false },
        { text: `${time} ${one.name}`, strong: true },
      ],
    ],
    basis: [`301동 → ${one.name} 걸어서 ${String(there)}분`, `${one.name} → 302동 걸어서 ${String(on)}분`],
    scene: scene(one, there, on),
    band: bandOf(date, now, start, end),
    menu: {
      price: one.price,
      dishes: one.dishes.map(([name, price, cuisine]) => ({ name, price, cuisine })),
    },
  };
}

// The answer for tomorrow (`date`, YYYY-MM-DD in Korea), asked at `now`: the Assistant's pick, 학생회관식당, first.
export function crowdedMealAnswer(date: string, now: string): AnswerReply & { input: MealInput } {
  return {
    input: {
      kind: 'meal',
      date,
      meal: 'lunch',
      people: [{ userId: ME.id, constraints: [] }],
      window: { from: null, until: null },
      placeId: null,
    },
    chips: [
      { kind: 'origin', text: '301동에서', userId: null },
      { kind: 'until', text: '15:30 수업까지', userId: null },
    ],
    plans: RESTAURANTS.map((one) => planOf(date, now, one)),
    dropped: [],
    noPlan: null,
    otherMeal: { meal: 'dinner', start: '17:00' },
  };
}

export function crowdedMealReply(date: string, now: string): AssistantReply & { answer: AnswerReply } {
  return {
    text: '학생회관식당 목살슬라이스덮밥이 좋아요. 가까운 302동식당은 찜닭이고 걸음 2분, 11:30에 열어요.',
    mapButtons: [],
    cards: [],
    proposal: null,
    answer: crowdedMealAnswer(date, now),
  };
}
