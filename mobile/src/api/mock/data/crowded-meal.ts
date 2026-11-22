/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, AssistantReply, MapScene, MealInput, Plan } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { B301, B302, type Restaurant, RESTAURANTS } from './crowded-restaurants';
import { ME } from './frame';
import { FRIENDS } from './friends';

// The crowded meal answer, for checking the map with real data (the answer screen's redesign, 2026-11-22): "내일 점심
// 뭐 먹을까" answered tomorrow with eleven restaurants at their buildings' points, two of them sharing 109동 and two
// 75-1동, between a Class ending at 301동 at 10:45 and one at 302동 at 15:30. Long names and long dish names are among
// them. The walks are worked out from the straight distance; the menus and prices are examples. 감골식당 and the
// 기숙사식당 open late, so they cannot be done before the Class at 15:30. 자하연식당 2층 is reached by the shuttle.

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
    const by = chosen.shuttle === undefined ? {} : { mode: 'shuttle' as const };
    routes.push({ userId: ME.id, role: 'me', from: B301, to: chosen.at, minutes: there, ...by });
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

// A part reached by the shuttle, as the shuttle-aware Plan sends it; nothing for a walk.
function byShuttleOf({ shuttle }: Restaurant): Pick<Plan['parts'][number], 'mode' | 'shuttle'> {
  return shuttle === undefined
    ? {}
    : { mode: 'shuttle', shuttle: { boardAt: shuttle.boardAt, getOffAt: shuttle.getOffAt } };
}

function basisOf(one: Restaurant, there: number, on: number): string[] {
  const way =
    one.shuttle === undefined
      ? `301동 → ${one.name} 걸어서 ${String(there)}분`
      : `301동 → ${one.name} 셔틀로 ${String(there)}분 (${one.shuttle.boardAt} 정류장 → ${one.shuttle.getOffAt} 정류장)`;
  return [way, `${one.name} → 302동 걸어서 ${String(on)}분`];
}

function planOf(date: string, now: string, one: Restaurant): Plan {
  const there = one.shuttle?.minutes ?? minutes(B301, one.at);
  const by = byShuttleOf(one);
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
        ...by,
      },
    ],
    subQuests: [{ at: at(date, start), placeId: `place-${one.building}`, title: `${one.name}에서 식사` }],
    lines: [
      [
        { text: '점심 ', strong: false },
        { text: `${time} ${one.name}`, strong: true },
      ],
    ],
    basis: basisOf(one, there, on),
    scene: scene(one, there, on),
    band: bandOf(date, now, start, end),
    menu: {
      price: one.price,
      dishes: one.dishes.map(([name, price, cuisine]) => ({ name, price, cuisine })),
    },
  };
}

// The way a restaurant adds to the day: there, by the shuttle or on foot, and on to 302동.
function walkOf(one: Restaurant): number {
  return (one.shuttle?.minutes ?? minutes(B301, one.at)) + minutes(one.at, B302);
}

// The answer for tomorrow (`date`, YYYY-MM-DD in Korea), asked at `now`: the least walking first, as the main server
// ranks a meal since P05 ticket 32, so that the pick is 302동식당.
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
    plans: RESTAURANTS.toSorted((one, other) => walkOf(one) - walkOf(other)).map((one) => planOf(date, now, one)),
    dropped: [],
    noPlan: null,
    otherMeal: { meal: 'dinner', start: '17:00' },
  };
}

// The answer once a Friend is added (`userId`): only 302동식당 fits the Friend's day as well, and the other ten are
// dropped, each with its reason as the main server words it.
export function crowdedWithFriend(date: string, now: string, userId: string): AnswerReply & { input: MealInput } {
  const alone = crowdedMealAnswer(date, now);
  const name = FRIENDS.find(({ id }) => id === userId)?.name ?? '친구';
  const kept = alone.plans.find(({ place }) => place.label === '302동식당') ?? alone.plans[0];
  const others = alone.plans.filter((plan) => plan !== kept);
  const dropped = others.map(({ place }, index) => ({
    place,
    reason:
      index % 3 === 0 ? `${name}${index % 2 === 0 ? '은' : '는'} 10분밖에 못 있어요` : '같이 있는 시간이 15분뿐이에요',
  }));
  // As the main server draws them: the others dropped, each tagged with its reason.
  const places = (kept?.scene.places ?? []).map((item) => {
    const drop = dropped.find(({ place }) => place.label === item.place.label);
    return drop === undefined
      ? item
      : { place: item.place, role: 'dropped' as const, tag: `${drop.place.label} · ${drop.reason}` };
  });
  return {
    ...alone,
    input: { ...alone.input, people: [...alone.input.people, { userId, constraints: [] }] },
    chips: [...alone.chips, { kind: 'person', text: `${name} · 출발지 모름`, userId }],
    plans: kept === undefined ? [] : [{ ...kept, scene: { ...kept.scene, places } }],
    dropped,
  };
}

export function crowdedMealReply(date: string, now: string): AssistantReply & { answer: AnswerReply } {
  return {
    text: '302동식당 순살안동식찜닭이 좋아요. 걸음 2분이고 11:30에 열어요. 학생회관식당은 목살슬라이스덮밥이고 걸음 32분이에요.',
    mapButtons: [],
    cards: [],
    proposal: null,
    answer: crowdedMealAnswer(date, now),
  };
}
