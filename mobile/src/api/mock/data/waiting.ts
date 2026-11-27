/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { KeptNotification, QuestInvitation } from '@/api/waiting-types';
import { frameTime } from './frame';

// What waits for the User in the `Profile` frame's 알림 besides the Friend Requests, which `../friendships.ts` keeps:
// an invitation to a 파티.

const TAE_O = { id: 'f8', name: '윤태오', department: '물리천문학부' };

export const QUEST_INVITATIONS: QuestInvitation[] = [
  {
    id: 'qi-1',
    quest: {
      id: 'q-report',
      title: '물리 실험 보고서',
      globalEvent: null,
      leader: TAE_O,
      holderCount: 1,
      capacity: 4,
      joinPolicy: 'closed',
      board: null,
      description: '실험 3 보고서 같이 정리해요. 데이터는 제가 가져갈게요.',
      createdAt: frameTime('10:10'),
    },
    sentAt: frameTime('10:15'),
  },
];

// The Notifications the main server keeps for the User: 김민준's answers to the User's requests to join, one accepted
// into the AI 커리어 설명회 party the User holds and one declined from the board's 알고리즘 코테 스터디; and a 파티 its
// Leader 최유나 ended, whose row says it is gone when pressed.
export const KEPT_NOTIFICATIONS: KeptNotification[] = [
  {
    id: 'join-accepted:party:q-ai',
    kind: 'join-accepted',
    title: 'AI 커리어 설명회 참여 신청이 수락됐어요',
    ahead: null,
    line: '김민준님의 파티',
    at: frameTime('11:20'),
    url: '/main?card=party:q-ai',
  },
  {
    id: 'join-declined:sent-requests:post-1',
    kind: 'join-declined',
    title: '알고리즘 코테 스터디 참여 신청이 거절됐어요',
    ahead: null,
    line: '김민준님의 파티',
    at: frameTime('10:40'),
    url: '/main?card=sent-requests:post-1',
  },
  {
    id: 'party-ended:party-gone:post-0',
    kind: 'party-ended',
    title: '버들골 저녁 러닝 크루 파티가 없어졌어요',
    ahead: null,
    line: '최유나님이 파티를 없앴어요',
    at: frameTime('09:30'),
    url: '/main?card=party-gone:post-0',
  },
];
