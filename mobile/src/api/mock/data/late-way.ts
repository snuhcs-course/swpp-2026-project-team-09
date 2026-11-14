/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { OwnWay } from '@/api/invitation-card-types';

// The main server's reply to 민수's report of being 5 minutes late in the worked example: the Quest of the meeting at
// 301동 from 12:18 and the meal at the Student Center from 12:33, reported at 11:50 by 민수, whose Class in 302동 ends at
// 12:15. Copied whole, with the day and 민수's User id those of the invitation card's copy.

export const LATE_WAY: OwnWay = {
  status: 'ok',
  origin: {
    place: {
      placeId: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
      label: '302동',
      latitude: 37.44887,
      longitude: 126.95265,
    },
    basis: 'timetable',
  },
  leaveAt: '2026-11-17T12:20:00+09:00',
  walkMinutes: 17,
  arriveAt: '2026-11-17T12:37:00+09:00',
  meeting: null,
  leaveBy: null,
  next: null,
  lines: [
    [
      {
        text: '12:37에야 도착해요.',
        strong: true,
      },
      {
        text: ' 걸어서 17분.',
        strong: false,
      },
    ],
  ],
  scene: {
    people: [
      {
        userId: '35976b5c-4daf-454f-b10e-c8b09a33ca37',
        name: '민수',
        me: true,
        at: {
          latitude: 37.44887,
          longitude: 126.95265,
        },
        source: 'timetable',
        tag: '나 · 17분',
      },
    ],
    places: [
      {
        place: {
          placeId: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
          label: '63동',
          latitude: 37.45932,
          longitude: 126.95058,
        },
        role: 'pick',
        tag: null,
      },
    ],
    routes: [
      {
        userId: '35976b5c-4daf-454f-b10e-c8b09a33ca37',
        role: 'me',
        from: {
          latitude: 37.44887,
          longitude: 126.95265,
        },
        to: {
          latitude: 37.45932,
          longitude: 126.95058,
        },
        minutes: 17,
      },
    ],
    flags: [
      {
        at: {
          latitude: 37.45932,
          longitude: 126.95058,
        },
        text: '12:33 학생회관식당에서 식사',
        role: 'place',
      },
    ],
  },
};
