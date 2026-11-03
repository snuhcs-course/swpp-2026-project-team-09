/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type JoinPolicy, type QuestBoard } from '../generated/prisma/client.js';

// The recruiting Quests of the Heuristic Evaluation (P15). Each is held by its Leader alone, with one Sub Quest.

// A Sub Quest at a time in Korea and a Place by the campus map's number, or the attending Sub Quest of a demo Global
// Event, by its key in src/demo/demo-data.ts.
export type HeSubQuest = { title: string; startsAt: string; endsAt: string; place: string } | { globalEvent: string };

export interface HeQuest {
  // Its number in the spec's table.
  number: number;
  title: string;
  board: QuestBoard;
  joinPolicy: JoinPolicy;
  capacity: number;
  leader: string;
  description: string;
  subQuest: HeSubQuest;
}

export const HE_QUESTS: readonly HeQuest[] = [
  {
    number: 1,
    title: '중도에서 같이 과제해요',
    board: 'hobby',
    joinPolicy: 'open',
    capacity: 6,
    leader: 'he-s3',
    description: '중앙도서관에서 각자 과제하다가 막히면 같이 봐요. 중간에 와도 괜찮아요.',
    subQuest: { title: '도서관 과제', startsAt: '2026-11-04T15:30', endsAt: '2026-11-04T17:30', place: '62' },
  },
  {
    number: 2,
    title: '학관에서 저녁 같이 먹어요',
    board: 'meal',
    joinPolicy: 'open',
    capacity: 6,
    leader: 'he-s1',
    description: '학생회관 식당에서 같이 저녁 먹을 사람 구해요. 편하게 들어오세요!',
    subQuest: { title: '학관 저녁', startsAt: '2026-11-04T18:00', endsAt: '2026-11-04T19:00', place: '63' },
  },
  {
    number: 3,
    title: '302동 식당 저녁',
    board: 'meal',
    joinPolicy: 'approval',
    capacity: 4,
    leader: 'he-r1b',
    description: '302동 식당에서 저녁 같이 드실 분, 신청해 주시면 확인할게요.',
    subQuest: { title: '302동 식당', startsAt: '2026-11-04T17:30', endsAt: '2026-11-04T18:30', place: '302' },
  },
  {
    number: 4,
    title: '자하연에서 점심',
    board: 'meal',
    joinPolicy: 'open',
    capacity: 4,
    leader: 'he-s3',
    description: '자하연식당에서 점심 같이 먹어요. 혼밥 싫은 분 누구나 환영해요.',
    subQuest: { title: '자하연 점심', startsAt: '2026-11-05T12:00', endsAt: '2026-11-05T13:00', place: '109' },
  },
  {
    number: 5,
    title: '마케팅 공모전 팀원 구해요',
    board: 'career',
    joinPolicy: 'approval',
    capacity: 5,
    leader: 'he-r2b',
    description: '마케팅 공모전에 같이 나갈 팀원을 구해요. 첫 회의에서 주제를 정해요. 신청 받아요.',
    subQuest: { title: '첫 회의', startsAt: '2026-11-05T19:00', endsAt: '2026-11-05T21:00', place: '58' },
  },
  {
    number: 6,
    title: '밴드 공연 같이 가요',
    board: 'show',
    joinPolicy: 'open',
    capacity: 6,
    leader: 'he-s1',
    description: '밴드 동아리 정기공연 같이 보러 가요. 끝나고 짧게 이야기 나눠요.',
    subQuest: { globalEvent: 'band-show' },
  },
  {
    number: 7,
    title: '토요일 아침 러닝',
    board: 'hobby',
    joinPolicy: 'open',
    capacity: 8,
    leader: 'he-s2',
    description: '토요일 아침 체육관 앞에서 모여 가볍게 뛰어요. 처음 뛰는 분도 환영해요.',
    subQuest: { title: '러닝', startsAt: '2026-11-07T08:00', endsAt: '2026-11-07T09:00', place: '71' },
  },
  {
    number: 8,
    title: '면접 스터디',
    board: 'career',
    joinPolicy: 'open',
    capacity: 6,
    leader: 'he-s2',
    description: '인문사회계멀티미디어강의동에서 모의 면접을 서로 봐 줘요. 질문 목록은 준비해 갈게요.',
    subQuest: { title: '모의 면접', startsAt: '2026-11-06T16:00', endsAt: '2026-11-06T18:00', place: '83' },
  },
];
