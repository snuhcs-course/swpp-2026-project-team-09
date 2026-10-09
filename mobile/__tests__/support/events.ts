/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type userEvent, within } from '@testing-library/react-native';
import type { MatchingRequest } from '@/api/matching-types';
import type { GlobalEvent, Quest } from '@/api/types';
import type { RecruitingQuest } from '@/api/party-types';
import type { FakeServer } from './fake-server';
import { pass, screen } from './app';
import { openMain } from './main';
import { answerMainScreen, DINNER, ME_ID } from './server';

// The 행사 tab against the fake main server, on Tuesday 6 October 2026 at 13:00 in Korea (`PHONE_NOW`). A test file
// that uses it mocks what `server.ts` and `live.ts` say.

// Today 18:00 to 20:00. Its id is the one the app's own list of announcers names.
export const CAREER: GlobalEvent = {
  id: 'e1',
  title: 'AI 커리어 설명회',
  description: '현직자가 들려주는 AI 직무 이야기',
  startsAt: '2026-10-06T09:00:00.000Z',
  endsAt: '2026-10-06T11:00:00.000Z',
  place: '301동 대강당',
  latitude: 37.45016,
  longitude: 126.95259,
  sourceUrl: 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176525',
};

// Thursday at 17:00, this week.
export const MAJOR: GlobalEvent = {
  id: 'e2',
  title: '지능형통신 연합전공 설명회',
  description: '2027학년도 1학기 선발 안내',
  startsAt: '2026-10-08T08:00:00.000Z',
  endsAt: null,
  place: '뉴미디어통신공동연구소 (132동)',
  latitude: 37.45487,
  longitude: 126.95407,
  sourceUrl: null,
};

// Next week.
export const BOOK_TALK: GlobalEvent = {
  id: 'e3',
  title: '도서관 북토크',
  description: '작가와의 대화',
  startsAt: '2026-10-14T09:30:00.000Z',
  endsAt: null,
  place: '중앙도서관 관정관 (62-1동)',
  latitude: 37.4598,
  longitude: 126.9521,
  sourceUrl: null,
};

export const SEO_YEON = { id: '6d1c3f5e-3333-4a5b-8c9d-000000000003', name: '이서연', department: '경영학과' };
export const TAE_O = { id: '6d1c3f5e-4444-4a5b-8c9d-000000000004', name: '윤태오', department: '물리천문학부' };

function gathering(id: string, leader: typeof SEO_YEON, joinPolicy: 'open' | 'approval'): RecruitingQuest {
  return {
    id,
    title: CAREER.title,
    globalEvent: { id: CAREER.id, title: CAREER.title },
    leader,
    holderCount: 2,
    capacity: 4,
    joinPolicy,
    board: 'show',
    description: '',
    createdAt: '2026-10-06T03:00:00.000Z',
    nextSubQuest: {
      id: `${id}-1`,
      title: '모이기',
      startsAt: '2026-10-06T08:40:00.000Z',
      endsAt: null,
      place: { placeId: null, label: '301동 앞', latitude: 37.45091, longitude: 126.95289 },
    },
  };
}

// Two Quests that gather for the career talk: 이서연's Open one and 윤태오's Approval one.
export const SEO_YEON_GOING = gathering('9a7e0c1d-0000-4f00-8000-0000000c0001', SEO_YEON, 'open');
export const TAE_O_GOING = gathering('9a7e0c1d-0000-4f00-8000-0000000c0002', TAE_O, 'approval');

// The User's own Quest for the career talk, held alone, from attending it.
export const MY_CAREER: Quest = {
  ...DINNER,
  id: '9a7e0c1d-0000-4f00-8000-0000000c0010',
  title: CAREER.title,
  globalEvent: { id: CAREER.id, title: CAREER.title },
  capacity: 1,
  holders: [{ id: ME_ID, name: '홍길동', department: '컴퓨터공학부' }],
  subQuests: [
    {
      id: '9a7e0c1d-0000-4f00-8000-0000000c0011',
      attending: true,
      title: CAREER.title,
      startsAt: CAREER.startsAt,
      endsAt: CAREER.endsAt,
      place: { placeId: null, label: '301동 대강당', latitude: 37.45016, longitude: 126.95259 },
      completion: 'by_time',
      cancelled: false,
      done: false,
      ended: false,
    },
  ],
};

export function waiting(globalEventId: string, size = 3, arrivedAt = '2026-10-06T04:00:00.000Z'): MatchingRequest {
  return { globalEventId, size, state: 'waiting', arrivedAt, questId: null };
}

interface Given {
  events?: GlobalEvent[];
  recruiting?: RecruitingQuest[];
  quests?: Quest[];
  matching?: MatchingRequest[];
}

// The main screen's answers and the 행사 tab's. The recruiting Quests answer by `?globalEventId=`.
export function answerEvents(server: FakeServer, given: Given = {}): void {
  const recruiting = given.recruiting ?? [SEO_YEON_GOING, TAE_O_GOING];
  answerMainScreen(server);
  server.on('GET /global-events', { status: 200, body: given.events ?? [CAREER, MAJOR, BOOK_TALK] });
  server.on('GET /quests/recruiting', ({ query }) => ({
    status: 200,
    body: recruiting.filter(
      ({ globalEvent }) => query.globalEventId === undefined || globalEvent?.id === query.globalEventId,
    ),
  }));
  server.on('GET /quests', { status: 200, body: given.quests ?? [DINNER] });
  server.on('GET /matching-requests', { status: 200, body: given.matching ?? [] });
}

type User = ReturnType<typeof userEvent.setup>;

// The main screen, then the 행사 tab.
export async function openEvents(more: Parameters<typeof openMain>[1] = {}): Promise<User> {
  const user = await openMain({}, more);
  await user.press(screen.getByRole('tab', { name: '행사' }));
  await pass(500);
  return user;
}

export function card(event: GlobalEvent): ReturnType<typeof within> {
  return within(screen.getByTestId(`event-${event.id}`));
}

// The titles of the events whose cards are shown.
export function shownEvents(): string[] {
  return [CAREER, MAJOR, BOOK_TALK]
    .filter(({ id }) => screen.queryByTestId(`event-${id}`) !== null)
    .map(({ title }) => title);
}
