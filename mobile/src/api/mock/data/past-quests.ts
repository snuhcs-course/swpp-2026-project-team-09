/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { JoinPolicy, Person } from '@/api/types';

// The app's own: the User's past plans, which `PartyMine` draws under `지난 일정` and the main server does not keep.
// `../../quest-parts/past-quests.ts` makes them Quests, dated back from today.

export interface PastPlan {
  id: string;
  title: string;
  joinPolicy: JoinPolicy;
  capacity: number;
  // Days before today, and the time of Korea's clock it started.
  daysAgo: number;
  hour: number;
  minute: number;
  place: string;
  // The Leader first; the User was one of the Holders besides them.
  others: Person[];
}

const HA_EUN = { id: 'f5', name: '정하은', department: '컴퓨터공학부' };
const MIN_JUN = { id: 'f1', name: '김민준', department: '컴퓨터공학부' };
const HA_RIN = { id: 'past-p1', name: '서하린', department: '체육교육과' };
const MIN_JAE = { id: 'past-p2', name: '강민재', department: '기계공학부' };

export const PAST_PLANS: readonly PastPlan[] = [
  {
    id: 'past-study',
    title: '자료구조 중간고사 스터디',
    joinPolicy: 'closed',
    capacity: 4,
    daysAgo: 3,
    hour: 19,
    minute: 0,
    place: '중앙도서관 (62동)',
    others: [HA_EUN, MIN_JUN],
  },
  {
    id: 'past-run',
    title: '버들골 저녁 러닝',
    joinPolicy: 'open',
    capacity: 8,
    daysAgo: 8,
    hour: 18,
    minute: 30,
    place: '버들골 (100동) 입구',
    others: [HA_RIN, MIN_JAE],
  },
];
