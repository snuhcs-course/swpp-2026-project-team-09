// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { v5 as uuidv5 } from 'uuid';

const ID_NAMESPACE = '6f1d2c4e-0b8a-4c55-9d3e-7a2b1c9e5f40';

// The same id in every database and every run, which is how a later run finds what an earlier one wrote.
export function demoId(name: string): string {
  return uuidv5(`demo:${name}`, ID_NAMESPACE);
}

export interface DemoUser {
  key: string;
  name: string;
  department: string;
  admissionYear: number;
  hashtags: string[];
  friendId: string;
  masterSwitchOn: boolean;
}

export const DEMO_USERS: DemoUser[] = [
  {
    key: 'minjun',
    name: '김민준',
    department: '컴퓨터공학부',
    admissionYear: 2022,
    hashtags: ['코딩', '보드게임'],
    friendId: 'DEMA2345',
    masterSwitchOn: true,
  },
  {
    key: 'seoyeon',
    name: '이서연',
    department: '경영학과',
    admissionYear: 2023,
    hashtags: ['독서', '카페'],
    friendId: 'DEMB2345',
    masterSwitchOn: true,
  },
  {
    key: 'jiho',
    name: '박지호',
    department: '기계공학부',
    admissionYear: 2021,
    hashtags: ['배드민턴', '맛집'],
    friendId: 'DEMC2345',
    masterSwitchOn: true,
  },
  {
    key: 'sua',
    name: '최수아',
    department: '심리학과',
    admissionYear: 2024,
    hashtags: ['사진', '산책'],
    friendId: 'DEMD2345',
    masterSwitchOn: true,
  },
  {
    key: 'yejun',
    name: '정예준',
    department: '경제학부',
    admissionYear: 2020,
    hashtags: ['러닝'],
    friendId: 'DEME2345',
    masterSwitchOn: false,
  },
  {
    key: 'haeun',
    name: '강하은',
    department: '국어국문학과',
    admissionYear: 2023,
    hashtags: ['밴드', '공연'],
    friendId: 'DEMF2345',
    masterSwitchOn: true,
  },
  {
    key: 'doyun',
    name: '윤도윤',
    department: '물리천문학부',
    admissionYear: 2022,
    hashtags: ['천체관측'],
    friendId: 'DEMG2345',
    masterSwitchOn: true,
  },
  {
    key: 'jiyu',
    name: '임지유',
    department: '작곡과',
    admissionYear: 2024,
    hashtags: ['피아노', '공연'],
    friendId: 'DEMH2345',
    masterSwitchOn: true,
  },
];

export const DEMO_FRIENDSHIPS: [string, string][] = [
  ['minjun', 'seoyeon'],
  ['minjun', 'jiho'],
  ['minjun', 'doyun'],
  ['seoyeon', 'sua'],
  ['jiho', 'sua'],
  ['sua', 'yejun'],
  ['haeun', 'jiyu'],
  ['seoyeon', 'jiyu'],
];

// When something happens, from the run: `hours` after the next half hour, or at a time of day `days` later in Seoul.
export type DemoTime = { hours: number } | { days: number; at: string };

export interface DemoGlobalEvent {
  key: string;
  title: string;
  description: string;
  // The campus map's number of the Place.
  place: string;
  startsAt: DemoTime;
  endsAt: DemoTime;
}

export const DEMO_GLOBAL_EVENTS: DemoGlobalEvent[] = [
  {
    key: 'career-talk',
    title: 'SW 개발자 진로 특강',
    description: '현직 개발자 선배들이 들려주는 취업과 진로 이야기입니다.',
    place: '301',
    startsAt: { hours: -0.5 },
    endsAt: { hours: 1.5 },
  },
  {
    key: 'autumn-concert',
    title: '가을 정기 음악회',
    description: '음악대학 학생들의 가을 정기 음악회입니다. 누구나 들어올 수 있습니다.',
    place: '73',
    startsAt: { hours: 3 },
    endsAt: { hours: 5 },
  },
  {
    key: 'band-show',
    title: '밴드 동아리 정기공연',
    description: '학생회관 라운지에서 열리는 밴드 동아리들의 정기공연입니다.',
    place: '63',
    startsAt: { days: 1, at: '19:00' },
    endsAt: { days: 1, at: '21:00' },
  },
  {
    key: 'book-talk',
    title: '중앙도서관 북토크',
    description: '이달의 책을 쓴 작가와 함께하는 북토크입니다.',
    place: '62',
    startsAt: { days: 2, at: '16:00' },
    endsAt: { days: 2, at: '17:30' },
  },
  {
    key: 'sports-day',
    title: '단과대 배드민턴 대회 예선',
    description: '단과대 대항 배드민턴 대회의 예선 경기입니다. 응원 오세요.',
    place: '71',
    startsAt: { days: 3, at: '14:00' },
    endsAt: { days: 3, at: '18:00' },
  },
  {
    key: 'job-fair',
    title: '가을 채용박람회',
    description: '기업 부스와 현장 상담이 열리는 채용박람회입니다.',
    place: '220',
    startsAt: { days: 4, at: '10:00' },
    endsAt: { days: 4, at: '17:00' },
  },
];

export const DEMO_PARTY = {
  key: 'study-party',
  title: '중도 스터디 중',
  quest: 'hobby-open',
  joinPolicy: 'open',
  capacity: 5,
} as const;

// What a real account named in DEMO_ACCOUNT_EMAILS is given.
export const DEMO_ACCOUNT_SHARE = {
  friends: ['minjun', 'seoyeon', 'jiho', 'sua', 'yejun'],
  friendRequestsFrom: ['haeun', 'doyun'],
  // The Leader of this Quest is one of the account's Friends.
  invitedInto: 'hobby-approval',
  meetup: {
    proposer: 'sua',
    title: '학관 앞에서 커피',
    place: '63',
    startsAt: { hours: 2 } as DemoTime,
    endsAt: { hours: 3 } as DemoTime,
  },
};
