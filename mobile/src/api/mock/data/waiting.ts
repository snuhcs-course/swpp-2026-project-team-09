import type { FriendRequests, Meetups, QuestInvitation } from '@/api/waiting-types';
import { frameTime, ME } from './frame';

// What waits for the User in the `Profile` frame's 알림: three Friend Requests, and two invitations to 파티, one a
// Quest's and one a Meetup's.

const SEO_YEON = { id: 'f2', name: '이서연', department: '경영학과' };
const TAE_O = { id: 'f8', name: '윤태오', department: '물리천문학부' };

export const FRIEND_REQUESTS: FriendRequests = {
  received: [
    { id: 'fr-1', sender: { name: '한도경', department: '산업공학과' }, sentAt: frameTime('12:40') },
    { id: 'fr-2', sender: { name: '김하늘', department: '컴퓨터공학부' }, sentAt: frameTime('11:05') },
    { id: 'fr-3', sender: { name: '박서준', department: '기계공학부' }, sentAt: frameTime('09:20') },
  ],
  sent: [],
};

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
