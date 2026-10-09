// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by fyoon46
import type { Meetups, QuestInvitation } from '@/api/waiting-types';
import { frameTime, ME } from './frame';

// What waits for the User in the `Profile` frame's 알림 besides the Friend Requests, which `../friendships.ts` keeps:
// two invitations to 파티, one a Quest's and one a Meetup's.

const SEO_YEON = { id: 'f2', name: '이서연', department: '경영학과' };
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

// Proposed for the next day at 12:10.
export const MEETUPS: Meetups = {
  received: [
    {
      id: 'mu-1',
      title: '학관 점심',
      startsAt: new Date(new Date(frameTime('12:10')).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      endsAt: null,
      place: { placeId: null, label: '학생회관 (63동)', latitude: 37.45907, longitude: 126.95023 },
      state: 'proposed',
      proposer: SEO_YEON,
      receiver: ME,
    },
  ],
  sent: [],
};
