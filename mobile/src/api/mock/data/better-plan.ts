/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { BetterPlan } from '@/api/plan-quest-types';

// The main server's reply to GET /plans/:questId/better after 지은 declined in the worked example (Tuesday 2026-11-17,
// asked at 11:50): the Leader made the Quest of the Student Center from 12:33 at POST /plans, 민수 accepted, and 지은
// declined. It offers 302동식당 from 12:15. Copied whole, with the asker's and 민수's ids those of the meal answer's copy.

const ASKER_ID = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const MINSU_ID = '35976b5c-4daf-454f-b10e-c8b09a33ca37';

export const BETTER_PLAN: BetterPlan = {
  current: {
    place: {
      placeId: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
      label: '63동',
      latitude: 37.45932,
      longitude: 126.95058,
    },
    startAt: '2026-11-17T12:33:00+09:00',
    endAt: '2026-11-17T12:55:00+09:00',
    togetherMinutes: 22,
  },
  better: {
    id: '302동식당',
    title: '302동식당에서 점심',
    place: {
      placeId: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
      label: '302동식당',
      latitude: 37.44887,
      longitude: 126.95265,
    },
    startAt: '2026-11-17T12:15:00+09:00',
    endAt: '2026-11-17T12:43:00+09:00',
    togetherMinutes: 28,
    meeting: null,
    parts: [
      {
        userId: ASKER_ID,
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
        leaveAt: '2026-11-17T12:12:00+09:00',
        walkMinutes: 3,
        leaveBy: '2026-11-17T12:43:00+09:00',
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
        userId: MINSU_ID,
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
        walkMinutes: 0,
        leaveBy: null,
        next: null,
      },
    ],
    subQuests: [
      {
        at: '2026-11-17T12:15:00+09:00',
        placeId: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
        title: '302동식당에서 식사',
      },
    ],
    lines: [
      [
        {
          text: '12:15 302동식당',
          strong: true,
        },
      ],
      [
        {
          text: '같이 먹으면 식사가 27분 줄어요',
          strong: false,
        },
      ],
    ],
    basis: [
      '민수 12:15 302동 수업 끝',
      '301동 → 302동식당 걸어서 3분',
      '302동식당 → 24동 걸어서 17분, 그래서 12:43에 나서요',
    ],
    scene: {
      people: [
        {
          userId: ASKER_ID,
          name: '유상',
          me: true,
          at: {
            latitude: 37.45016,
            longitude: 126.95259,
          },
          source: 'timetable',
          tag: '나 · 3분',
        },
        {
          userId: MINSU_ID,
          name: '민수',
          me: false,
          at: {
            latitude: 37.44887,
            longitude: 126.95265,
          },
          source: 'timetable',
          tag: '민수',
        },
      ],
      places: [
        {
          place: {
            placeId: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
            label: '302동식당',
            latitude: 37.44887,
            longitude: 126.95265,
          },
          role: 'pick',
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
            placeId: 'f4f4b780-d70b-548e-afd3-992242304d80',
            label: '3식당',
            latitude: 37.45647,
            longitude: 126.94851,
          },
          role: 'candidate',
          tag: '3식당',
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
      ],
      routes: [
        {
          userId: ASKER_ID,
          role: 'me',
          from: {
            latitude: 37.45016,
            longitude: 126.95259,
          },
          to: {
            latitude: 37.44887,
            longitude: 126.95265,
          },
          minutes: 3,
        },
        {
          userId: ASKER_ID,
          role: 'next',
          from: {
            latitude: 37.44887,
            longitude: 126.95265,
          },
          to: {
            latitude: 37.45942,
            longitude: 126.94989,
          },
          minutes: 17,
        },
      ],
      flags: [
        {
          at: {
            latitude: 37.44887,
            longitude: 126.95265,
          },
          text: '12:15 점심',
          role: 'place',
        },
      ],
    },
    band: {
      range: {
        startAt: '2026-11-17T11:30:00+09:00',
        endAt: '2026-11-17T13:30:00+09:00',
      },
      now: '2026-11-17T11:50:00+09:00',
      lanes: [
        {
          userId: ASKER_ID,
          name: '나',
          busy: [
            {
              startAt: '2026-11-17T11:30:00+09:00',
              endAt: '2026-11-17T11:50:00+09:00',
            },
            {
              startAt: '2026-11-17T13:00:00+09:00',
              endAt: '2026-11-17T13:30:00+09:00',
            },
          ],
        },
        {
          userId: MINSU_ID,
          name: '민수',
          busy: [
            {
              startAt: '2026-11-17T11:30:00+09:00',
              endAt: '2026-11-17T12:15:00+09:00',
            },
          ],
        },
      ],
      startAt: '2026-11-17T12:15:00+09:00',
      endAt: '2026-11-17T12:43:00+09:00',
      text: '12:15–12:43 · 식사 28분',
    },
  },
  input: {
    kind: 'meal',
    date: '2026-11-17',
    meal: 'lunch',
    people: [
      {
        userId: ASKER_ID,
        constraints: [],
      },
      {
        userId: MINSU_ID,
        constraints: [],
      },
    ],
    window: {
      from: null,
      until: null,
    },
    placeId: null,
  },
};
