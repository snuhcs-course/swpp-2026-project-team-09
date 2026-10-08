import type { RecruitingQuest } from '@/api/party-types';
import type { GlobalEvent, MyParty, Party, PartyQuest, Quest, SubQuest } from '@/api/types';
import { PARTY_MEMBER } from './friends';
import { frameTime, ME } from './frame';

// What the `Main` frame shows to go to: one Global Event, the Party that goes to it, a dinner with a Friend, which is
// a Shared Quest and no Party's, and today's class.

export const GLOBAL_EVENTS: GlobalEvent[] = [
  {
    id: 'e1',
    title: 'AI 커리어 설명회',
    description: '',
    startsAt: frameTime('18:00'),
    endsAt: frameTime('20:00'),
    place: '301동 대강당',
    latitude: 37.45016,
    longitude: 126.95259,
    sourceUrl: null,
  },
];

// The app's own: who announced a Global Event, which the frame's card shows and the stored event does not hold.
export const GLOBAL_EVENT_ANNOUNCERS: { eventId: string; announcer: string }[] = [
  { eventId: 'e1', announcer: '컴퓨터공학부 공지' },
];

function subQuest(id: string, title: string, start: string, end: string | null, place: SubQuest['place']): SubQuest {
  return {
    id,
    attending: true,
    title,
    startsAt: start,
    endsAt: end,
    place,
    completion: 'by_time',
    cancelled: false,
    done: false,
    ended: false,
  };
}

const HA_EUN = { id: 'f5', name: '정하은', department: '컴퓨터공학부' };
const MIN_JUN = { id: 'f1', name: '김민준', department: '컴퓨터공학부' };

// The User's Quests in the order they were made, then today's Class Quest.
export const QUESTS: Quest[] = [
  {
    id: 'q-ai',
    title: 'AI 커리어 설명회',
    globalEvent: { id: 'e1', title: 'AI 커리어 설명회' },
    leader: MIN_JUN,
    capacity: 6,
    joinPolicy: 'open',
    holders: [MIN_JUN, ME, PARTY_MEMBER, HA_EUN],
    subQuests: [
      subQuest('q-ai-1', 'AI 커리어 설명회', frameTime('17:40'), frameTime('20:00'), {
        placeId: null,
        label: '301동 앞',
        latitude: 37.45091,
        longitude: 126.95289,
      }),
    ],
    classQuest: false,
    waitingJoinRequests: 0,
    board: 'career',
    description: '설명회 끝나고 같이 저녁 먹어요.',
    createdAt: frameTime('09:12'),
  },
  {
    id: 'q-dinner',
    title: '저녁 약속',
    globalEvent: null,
    // A Meetup that 김민준 proposed.
    leader: MIN_JUN,
    capacity: 4,
    joinPolicy: 'closed',
    holders: [MIN_JUN, ME],
    subQuests: [
      subQuest('q-dinner-1', '저녁 약속', frameTime('20:10'), null, {
        placeId: null,
        label: '학생회관 (63동)',
        latitude: 37.45907,
        longitude: 126.95023,
      }),
    ],
    classQuest: false,
    waitingJoinRequests: 0,
    board: null,
    description: '',
    createdAt: frameTime('10:40'),
  },
  {
    id: 'c1',
    title: '자료구조',
    globalEvent: null,
    leader: null,
    capacity: 1,
    joinPolicy: 'closed',
    holders: [ME],
    subQuests: [
      {
        ...subQuest('c1', '자료구조', frameTime('14:00'), frameTime('15:15'), {
          placeId: 'place-301',
          label: '301동 118호',
          latitude: 37.45016,
          longitude: 126.95259,
        }),
        // Nobody attends a class through the app: the timetable makes its Quest.
        attending: false,
      },
    ],
    classQuest: true,
    waitingJoinRequests: 0,
    board: null,
    description: '',
    createdAt: null,
  },
];

const AI_PARTY_QUEST: PartyQuest = {
  id: 'q-ai',
  title: 'AI 커리어 설명회',
  globalEvent: { id: 'e1', title: 'AI 커리어 설명회' },
};

const AI_PARTY = { id: 'm1', title: 'AI 커리어 설명회 같이 가요', capacity: 6, joinPolicy: 'open' } as const;

export const PARTIES: Party[] = [
  {
    ...AI_PARTY,
    memberCount: 4,
    quest: AI_PARTY_QUEST,
    holdsQuest: true,
    friends: [MIN_JUN],
    leader: { id: HA_EUN.id, name: HA_EUN.name },
  },
];

// The frame's "활성 파티": three members share their position with the User.
export const MY_PARTY: MyParty = {
  ...AI_PARTY,
  quest: AI_PARTY_QUEST,
  sharing: true,
  members: [
    { ...HA_EUN, leader: true, visible: true },
    { ...MIN_JUN, leader: false, visible: true },
    { ...PARTY_MEMBER, leader: false, visible: true },
    { ...ME, leader: false, visible: true },
  ],
};

// A Quest that gathers people for the Global Event, which the User does not hold. The boards' list holds it too.
export const CAREER_GATHERING: RecruitingQuest = {
  id: 'q-ai-seo-yeon',
  title: 'AI 커리어 설명회',
  globalEvent: { id: 'e1', title: 'AI 커리어 설명회' },
  leader: { id: 'f7', name: '이서연', department: '경영학과' },
  holderCount: 2,
  capacity: 4,
  joinPolicy: 'open',
  board: 'career',
  description: '설명회 전에 301동 앞에서 만나요.',
  createdAt: frameTime('11:20'),
  nextSubQuest: {
    id: 'q-ai-seo-yeon-1',
    title: '모이기',
    startsAt: frameTime('17:30'),
    endsAt: null,
    place: { placeId: null, label: '301동 앞', latitude: 37.45091, longitude: 126.95289 },
  },
};
