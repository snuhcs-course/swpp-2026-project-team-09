import { act, type userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { RecruitingQuest } from '@/api/party-types';
import type { Quest } from '@/api/types';
import type { MyJoinRequest, QuestInvitation } from '@/api/waiting-types';
import type { FakeServer } from './fake-server';
import { pass } from './app';
import { openMain } from './main';
import { ME_HOLDER, MIN_JUN_HOLDER, SEO_YEON_HOLDER } from './room';
import { answerMainScreen, DINNER } from './server';

// The 파티 tab against the fake main server, at 13:00 of Tuesday 6 October 2026 in Korea. A test file that uses it
// mocks what `server.ts` and `live.ts` say.

export const YU_NA = { id: '6d1c3f5e-5555-4a5b-8c9d-000000000005', name: '최유나', department: '디자인학부' };

// An Open Quest of 최유나 on the hobby board, posted today at 12:30, for tonight at 19:30.
export const RUN: RecruitingQuest = {
  id: '9a7e0c1d-0000-4f00-8000-0000000c0001',
  title: '버들골 저녁 러닝 크루',
  globalEvent: null,
  leader: YU_NA,
  holderCount: 3,
  capacity: 8,
  joinPolicy: 'open',
  board: 'hobby',
  description: '수업 끝나고 버들골 한 바퀴 가볍게 뛰어요!',
  createdAt: '2026-10-06T03:30:00.000Z',
  nextSubQuest: {
    id: '9a7e0c1d-0000-4f00-8000-0000000c0011',
    title: '러닝',
    startsAt: '2026-10-06T10:30:00.000Z',
    endsAt: null,
    place: { placeId: null, label: '버들골 (100동) 입구', latitude: 37.4598, longitude: 126.9521 },
  },
};

// An Approval Quest of 김민준 on the career board, posted on Monday at 15:57, for Thursday at 20:00, at no place.
export const CODING: RecruitingQuest = {
  id: '9a7e0c1d-0000-4f00-8000-0000000c0002',
  title: '알고리즘 코테 스터디',
  globalEvent: null,
  leader: MIN_JUN_HOLDER,
  holderCount: 1,
  capacity: 4,
  joinPolicy: 'approval',
  board: 'career',
  description: '백준 골드 문제 2개씩 풀고 코드 리뷰해요.',
  createdAt: '2026-10-05T06:57:00.000Z',
  nextSubQuest: {
    id: '9a7e0c1d-0000-4f00-8000-0000000c0021',
    title: '스터디',
    startsAt: '2026-10-08T11:00:00.000Z',
    endsAt: null,
    place: null,
  },
};

// An Open Quest of 이서연 for the 재즈 정기공연, without a time.
export const JAZZ: RecruitingQuest = {
  id: '9a7e0c1d-0000-4f00-8000-0000000c0003',
  title: '재즈 동아리 정기공연 같이 봐요',
  globalEvent: { id: 'e-jazz', title: '재즈 정기공연' },
  leader: SEO_YEON_HOLDER,
  holderCount: 5,
  capacity: 6,
  joinPolicy: 'open',
  board: 'show',
  description: '',
  createdAt: '2026-10-04T12:14:00.000Z',
  nextSubQuest: { ...RUN.nextSubQuest, startsAt: null, place: null },
};

// The User's own Open Quest on the hobby board, posted today at 12:50.
export const MY_HIKE: Quest = {
  ...DINNER,
  id: '9a7e0c1d-0000-4f00-8000-0000000c0004',
  title: '관악산 아침 등산',
  capacity: 6,
  joinPolicy: 'open',
  board: 'hobby',
  description: '연주대까지 천천히 올라가요.',
  createdAt: '2026-10-06T03:50:00.000Z',
  holders: [ME_HOLDER],
};

export function requestFor(quest: RecruitingQuest, id = 'qr1'): MyJoinRequest {
  const { nextSubQuest: _next, ...summary } = quest;
  return { id, quest: summary, sentAt: '2026-10-06T03:55:00.000Z' };
}

export function invitationTo(quest: RecruitingQuest, id: string): QuestInvitation {
  return { ...requestFor(quest, id), sentAt: '2026-10-06T03:40:00.000Z' };
}

interface Answers {
  recruiting?: RecruitingQuest[];
  quests?: Quest[];
  requests?: MyJoinRequest[];
  invitations?: QuestInvitation[];
}

// The main screen's answers, and the 파티 tab's, which the test changes through the returned setter.
export function answerParty(server: FakeServer, answers: Answers = {}): (next: Answers) => void {
  let held: Required<Answers> = { recruiting: [RUN, CODING, JAZZ], quests: [DINNER], requests: [], invitations: [] };
  answerMainScreen(server);
  const set = (next: Answers): void => {
    held = { ...held, ...next };
  };
  set(answers);
  server.on('GET /quests/recruiting', ({ query }) => ({
    status: 200,
    body: held.recruiting.filter(({ board }) => query.board === undefined || board === query.board),
  }));
  server.on('GET /quests', () => ({ status: 200, body: held.quests }));
  server.on('GET /quest-join-requests', () => ({ status: 200, body: held.requests }));
  server.on('GET /quest-invitations', () => ({ status: 200, body: held.invitations }));
  server.on('GET /friends', {
    status: 200,
    body: [
      { ...MIN_JUN_HOLDER, sharing: true, visible: true },
      { ...SEO_YEON_HOLDER, sharing: true, visible: false },
      { ...YU_NA, sharing: true, visible: false },
    ],
  });
  return set;
}

type User = ReturnType<typeof userEvent.setup>;

// The main screen, then an address of the 파티 tab or above it.
export async function openAt(address: string): Promise<User> {
  const user = await openMain();
  await act(() => {
    router.navigate(address);
  });
  await pass(500);
  return user;
}
