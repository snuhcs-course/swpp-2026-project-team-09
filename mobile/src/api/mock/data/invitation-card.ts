/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { InvitationCard } from '@/api/invitation-card-types';

// The main server's card for 민수 in the worked example: the Leader's Quest with the meeting at 301동 from 12:18 and the
// meal at the Student Center from 12:33, read on Tuesday 2026-11-17 at 11:50, copied whole. The User ids are those of
// the meal answer's copy.

export const INVITATION_CARD: InvitationCard = {
  id: 'e87f513c-77f7-4d9b-84a8-00cca2c7cbbb',
  sentAt: '2026-11-14T13:31:24.717Z',
  quest: {
    id: '0f915a7b-07e5-43c3-81b4-459d020dbf28',
    title: '점심',
    globalEvent: null,
    leader: {
      id: '11ca538e-e4ef-48d9-9a1f-b7160c553bee',
      name: '유상',
      department: '컴퓨터공학부',
    },
    holderCount: 1,
    capacity: 4,
    joinPolicy: 'closed',
    board: null,
    description: '',
    createdAt: '2026-11-14T13:31:24.427Z',
  },
  holders: [
    {
      id: '11ca538e-e4ef-48d9-9a1f-b7160c553bee',
      name: '유상',
    },
  ],
  steps: [
    {
      id: '35aac473-824f-4621-9855-01c136b94eaa',
      title: '유상, 민수: 301동 앞에서 만나기',
      startsAt: '2026-11-17T03:18:00.000Z',
      endsAt: '2026-11-17T03:33:00.000Z',
      place: {
        placeId: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
        label: '제1공학관',
        latitude: 37.45016,
        longitude: 126.95259,
      },
    },
    {
      id: 'b7608931-8dba-494d-bc29-dbed697df89e',
      title: '학생회관식당에서 식사',
      startsAt: '2026-11-17T03:33:00.000Z',
      endsAt: '2026-11-17T03:55:00.000Z',
      place: {
        placeId: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
        label: '학생회관',
        latitude: 37.45932,
        longitude: 126.95058,
      },
    },
  ],
  gathering: {
    place: {
      placeId: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
      label: '63동',
      latitude: 37.45932,
      longitude: 126.95058,
    },
    startAt: '2026-11-17T12:33:00+09:00',
    endAt: '2026-11-17T12:55:00+09:00',
  },
  way: {
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
    leaveAt: '2026-11-17T12:15:00+09:00',
    walkMinutes: 18,
    arriveAt: '2026-11-17T12:33:00+09:00',
    meeting: {
      place: {
        placeId: '1a242be2-05c6-5185-bcd1-0b78bc358f88',
        label: '301동',
        latitude: 37.45016,
        longitude: 126.95259,
      },
      at: '2026-11-17T12:18:00+09:00',
    },
    leaveBy: null,
    next: null,
    lines: [
      [
        {
          text: '12:15에 수업이 끝나면 바로 나서면 돼요.',
          strong: true,
        },
        {
          text: ' 걸어서 18분.',
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
          tag: '나 · 18분',
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
          role: 'me',
          from: {
            latitude: 37.44887,
            longitude: 126.95265,
          },
          to: {
            latitude: 37.45016,
            longitude: 126.95259,
          },
          minutes: 3,
        },
        {
          userId: '35976b5c-4daf-454f-b10e-c8b09a33ca37',
          role: 'me',
          from: {
            latitude: 37.45016,
            longitude: 126.95259,
          },
          to: {
            latitude: 37.45932,
            longitude: 126.95058,
          },
          minutes: 15,
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
        {
          at: {
            latitude: 37.45016,
            longitude: 126.95259,
          },
          text: '12:18 유상과 만남',
          role: 'meeting',
        },
      ],
    },
  },
};
