/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { Quest } from '@/api/types';
import type { Meetup } from '@/api/waiting-types';
import type { FakeServer } from './fake-server';
import { pass } from './app';
import { openMain } from './main';
import { ME_HOLDER, SEO_YEON_HOLDER } from './room';
import { MIN_JUN } from './server';

// Meetups against the fake main server, at the phone's clock of `server.ts`: 6 October 2026, 13:00 in Korea.

export const ENGINEERING = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };

export const UUID = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u;
// Today at 19:00 in Korea, as the date·time sheet picks it.
export const SEVEN_PM = '2026-10-06T10:00:00.000Z';

// 이서연's proposal to the User, today at 18:00 at 학생회관.
export const LUNCH: Meetup = {
  id: 'mu1',
  title: '학관 점심',
  startsAt: '2026-10-06T09:00:00.000Z',
  endsAt: null,
  place: { placeId: null, label: '학생회관', latitude: 37.45932, longitude: 126.95058 },
  state: 'proposed',
  proposer: SEO_YEON_HOLDER,
  receiver: ME_HOLDER,
};

// The User's proposal to 김민준, tomorrow from 12:00 to 13:00.
export const STUDY: Meetup = {
  ...LUNCH,
  id: 'mu2',
  title: '같이 공부',
  startsAt: '2026-10-07T03:00:00.000Z',
  endsAt: '2026-10-07T04:00:00.000Z',
  proposer: ME_HOLDER,
  receiver: { id: MIN_JUN.id, name: MIN_JUN.name, department: MIN_JUN.department },
};

// The Shared Quest of the accepted lunch, which 이서연 leads.
export const SHARED: Quest = {
  id: '9a7e0c1d-0000-4f00-8000-0000000c0001',
  title: LUNCH.title,
  globalEvent: null,
  leader: SEO_YEON_HOLDER,
  capacity: 4,
  joinPolicy: 'closed',
  holders: [SEO_YEON_HOLDER, ME_HOLDER],
  subQuests: [
    {
      id: '9a7e0c1d-0000-4f00-8000-0000000c0011',
      attending: false,
      title: LUNCH.title,
      startsAt: LUNCH.startsAt,
      endsAt: null,
      place: LUNCH.place,
      completion: 'by_hand',
      cancelled: false,
      done: false,
      ended: false,
    },
  ],
  classQuest: false,
  waitingJoinRequests: 0,
  board: null,
  description: '',
  createdAt: '2026-10-06T03:00:00.000Z',
};

export function answerMeetups(server: FakeServer, received: Meetup[], sent: Meetup[] = []): void {
  server.on('GET /meetups', { status: 200, body: { received, sent } });
}

// The 파티 tab at its 초대.
export async function openInvites(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await act(() => {
    router.navigate('/party?tab=invites');
  });
  await pass(500);
  return user;
}
