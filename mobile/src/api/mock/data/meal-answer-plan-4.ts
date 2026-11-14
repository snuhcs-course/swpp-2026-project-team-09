/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Plan } from '@/api/assistant-types';

// Plan 4 of 5 of the answer in `meal-answer.ts`, as the main server gave it.

export const MEAL_PLAN_4: Plan = {
  id: '3식당',
  title: '3식당에서 점심',
  place: { placeId: 'f4f4b780-d70b-548e-afd3-992242304d80', label: '3식당', latitude: 37.45647, longitude: 126.94851 },
  startAt: '2026-11-17T12:31:00+09:00',
  endAt: '2026-11-17T12:54:00+09:00',
  togetherMinutes: 23,
  meeting: {
    place: {
      placeId: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
      label: '301동',
      latitude: 37.45016,
      longitude: 126.95259,
    },
    at: '2026-11-17T12:18:00+09:00',
    userIds: ['11ca538e-e4ef-48d9-9a1f-b7160c553bee', '35976b5c-4daf-454f-b10e-c8b09a33ca37'],
  },
  parts: [
    {
      userId: '11ca538e-e4ef-48d9-9a1f-b7160c553bee',
      name: '유상',
      me: true,
      origin: {
        place: {
          placeId: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
          label: '301동',
          latitude: 37.45016,
          longitude: 126.95259,
        },
        basis: 'timetable',
      },
      leaveAt: '2026-11-17T12:18:00+09:00',
      walkMinutes: 13,
      leaveBy: '2026-11-17T12:54:00+09:00',
      next: {
        startAt: '2026-11-17T13:00:00+09:00',
        place: {
          placeId: '055a68b1-3f09-5ea7-a98f-6f5febf1c6af',
          label: '24동',
          latitude: 37.45942,
          longitude: 126.94989,
        },
      },
    },
    {
      userId: '35976b5c-4daf-454f-b10e-c8b09a33ca37',
      name: '민수',
      me: false,
      origin: {
        place: {
          placeId: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
          label: '302동',
          latitude: 37.44887,
          longitude: 126.95265,
        },
        basis: 'timetable',
      },
      leaveAt: '2026-11-17T12:15:00+09:00',
      walkMinutes: 16,
      leaveBy: null,
      next: null,
    },
  ],
  subQuests: [
    {
      at: '2026-11-17T12:18:00+09:00',
      placeId: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
      title: '유상, 민수: 301동 앞에서 만나기',
    },
    { at: '2026-11-17T12:31:00+09:00', placeId: 'f4f4b780-d70b-548e-afd3-992242304d80', title: '3식당에서 식사' },
  ],
  lines: [[{ text: '12:31 3식당', strong: true }], [{ text: '같이 먹으면 식사가 32분 줄어요', strong: false }]],
  basis: [
    '민수 12:15 302동 수업 끝 · 301동까지 걸어서 3분, 같이 13분',
    '3식당 → 24동 걸어서 6분, 그래서 12:54에 나서요',
  ],
  scene: {
    people: [
      {
        userId: '11ca538e-e4ef-48d9-9a1f-b7160c553bee',
        name: '유상',
        me: true,
        at: { latitude: 37.45016, longitude: 126.95259 },
        source: 'timetable',
        tag: '나 · 13분',
      },
      {
        userId: '35976b5c-4daf-454f-b10e-c8b09a33ca37',
        name: '민수',
        me: false,
        at: { latitude: 37.44887, longitude: 126.95265 },
        source: 'timetable',
        tag: '민수 · 16분',
      },
    ],
    places: [
      {
        place: {
          placeId: 'f4f4b780-d70b-548e-afd3-992242304d80',
          label: '3식당',
          latitude: 37.45647,
          longitude: 126.94851,
        },
        role: 'pick',
        tag: '3식당',
      },
      {
        place: {
          placeId: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
          label: '302동식당',
          latitude: 37.44887,
          longitude: 126.95265,
        },
        role: 'candidate',
        tag: '302동식당',
      },
      {
        place: {
          placeId: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
          label: '301동식당',
          latitude: 37.45016,
          longitude: 126.95259,
        },
        role: 'candidate',
        tag: '301동식당',
      },
      {
        place: {
          placeId: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
          label: '학생회관식당',
          latitude: 37.45932,
          longitude: 126.95058,
        },
        role: 'candidate',
        tag: '학생회관식당',
      },
      {
        place: {
          placeId: 'b56be928-cbfe-5c4b-aaa1-40171ba126d1',
          label: '자하연식당 2층',
          latitude: 37.46098,
          longitude: 126.95252,
        },
        role: 'candidate',
        tag: '자하연식당 2층',
      },
      {
        place: {
          placeId: '055a68b1-3f09-5ea7-a98f-6f5febf1c6af',
          label: '24동',
          latitude: 37.45942,
          longitude: 126.94989,
        },
        role: 'next',
        tag: '13:00 수업 · 24동',
      },
      {
        place: {
          placeId: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
          label: '301동',
          latitude: 37.45016,
          longitude: 126.95259,
        },
        role: 'meeting',
        tag: null,
      },
    ],
    routes: [
      {
        userId: '35976b5c-4daf-454f-b10e-c8b09a33ca37',
        role: 'friend',
        from: { latitude: 37.44887, longitude: 126.95265 },
        to: { latitude: 37.45016, longitude: 126.95259 },
        minutes: 3,
      },
      {
        userId: '11ca538e-e4ef-48d9-9a1f-b7160c553bee',
        role: 'me',
        from: { latitude: 37.45016, longitude: 126.95259 },
        to: { latitude: 37.45647, longitude: 126.94851 },
        minutes: 13,
      },
      {
        userId: '11ca538e-e4ef-48d9-9a1f-b7160c553bee',
        role: 'next',
        from: { latitude: 37.45647, longitude: 126.94851 },
        to: { latitude: 37.45942, longitude: 126.94989 },
        minutes: 6,
      },
    ],
    flags: [
      { at: { latitude: 37.45647, longitude: 126.94851 }, text: '12:31 점심', role: 'place' },
      { at: { latitude: 37.45016, longitude: 126.95259 }, text: '12:18 민수와 만남', role: 'meeting' },
    ],
  },
  band: {
    range: { startAt: '2026-11-17T11:30:00+09:00', endAt: '2026-11-17T13:30:00+09:00' },
    now: '2026-11-17T11:50:00+09:00',
    lanes: [
      {
        userId: '11ca538e-e4ef-48d9-9a1f-b7160c553bee',
        name: '나',
        busy: [
          { startAt: '2026-11-17T11:30:00+09:00', endAt: '2026-11-17T11:50:00+09:00' },
          { startAt: '2026-11-17T13:00:00+09:00', endAt: '2026-11-17T13:30:00+09:00' },
        ],
      },
      {
        userId: '35976b5c-4daf-454f-b10e-c8b09a33ca37',
        name: '민수',
        busy: [{ startAt: '2026-11-17T11:30:00+09:00', endAt: '2026-11-17T12:15:00+09:00' }],
      },
    ],
    startAt: '2026-11-17T12:31:00+09:00',
    endAt: '2026-11-17T12:54:00+09:00',
    text: '12:31–12:54 · 식사 23분',
  },
};
