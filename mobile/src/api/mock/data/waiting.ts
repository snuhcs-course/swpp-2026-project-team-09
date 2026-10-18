/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { QuestInvitation } from '@/api/waiting-types';
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
