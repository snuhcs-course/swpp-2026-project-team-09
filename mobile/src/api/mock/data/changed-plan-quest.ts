/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Quest } from '@/api/types';

// The main server's reply to PUT /plans/:questId with the better Plan of `better-plan.ts`: the Quest changed to
// 302동식당 from 12:15, 민수 still a Holder. Copied whole, with the asker's and 민수's ids those of the meal answer's
// copy.

const ASKER_ID = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
const MINSU_ID = '35976b5c-4daf-454f-b10e-c8b09a33ca37';

export const CHANGED_PLAN_QUEST: Quest = {
  id: 'fa857767-22f7-431b-9bc4-19c5a340d3e9',
  title: '302동식당에서 점심',
  globalEvent: null,
  leader: {
    id: ASKER_ID,
    name: '유상',
    department: '컴퓨터공학부',
  },
  capacity: 4,
  joinPolicy: 'closed',
  board: null,
  description: '',
  createdAt: '2026-11-14T14:23:19.175Z',
  holders: [
    {
      id: ASKER_ID,
      name: '유상',
      department: '컴퓨터공학부',
    },
    {
      id: MINSU_ID,
      name: '민수',
      department: '컴퓨터공학부',
    },
  ],
  subQuests: [
    {
      id: 'bdcd592b-000c-4af6-bb32-b4812dfcaa83',
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
    {
      user: {
        id: ASKER_ID,
        name: '유상',
        department: '컴퓨터공학부',
      },
      state: 'accepted',
      lateMinutes: null,
    },
    {
      user: {
        id: MINSU_ID,
        name: '민수',
        department: '컴퓨터공학부',
      },
      state: 'accepted',
      lateMinutes: null,
    },
  ],
};
