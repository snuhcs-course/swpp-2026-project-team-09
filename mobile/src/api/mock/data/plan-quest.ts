/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import type { PlanQuest } from '@/api/plan-quest-types';

// The main server's reply to POST /plans for the first Plan of the answer in `meal-answer.ts` (302동식당, Tuesday
// 2026-11-17, asked at 11:50), copied whole, with the asker's and 민수's ids those of that answer, and its members as
// the main server lists them.

const ASKER_ID = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const MINSU_ID = '35976b5c-4daf-454f-b10e-c8b09a33ca37';

export const PLAN_QUEST: PlanQuest = {
  quest: {
    id: 'fb964f86-fdff-49ec-b4bb-875851891162',
    title: '302동식당에서 점심',
    globalEvent: null,
    leader: { id: ASKER_ID, name: '유상', department: '컴퓨터공학부' },
    capacity: 4,
    joinPolicy: 'closed',
    board: null,
    description: '',
    createdAt: '2026-11-14T13:08:34.074Z',
    holders: [{ id: ASKER_ID, name: '유상', department: '컴퓨터공학부' }],
    subQuests: [
      {
        id: 'ed244b82-2fe1-4cef-ba28-75d4eb5379e3',
        attending: false,
        title: '302동식당에서 식사',
        startsAt: '2026-11-17T03:15:00.000Z',
        endsAt: '2026-11-17T03:43:00.000Z',
        place: {
          placeId: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
          label: '제2공학관',
          latitude: 37.44887,
          longitude: 126.95265,
        },
        cancelled: false,
        completion: 'by_time',
        done: false,
        ended: false,
      },
    ],
    classQuest: false,
    waitingJoinRequests: 0,
    members: [
      { user: { id: ASKER_ID, name: '유상', department: '컴퓨터공학부' }, state: 'accepted', lateMinutes: null },
      { user: { id: MINSU_ID, name: '민수', department: '컴퓨터공학부' }, state: 'invited', lateMinutes: null },
    ],
  },
  invitations: [{ id: 'e8467ebb-6d3a-4cce-98c9-90bedca58d47', userId: MINSU_ID }],
};
