/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { MeetInput } from '@/api/meet-plan-types';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import type { Friend } from '@/api/types';
import { pass, screen } from './app';
import type { FakeServer } from './fake-server';
import type { openMain } from './main';
import { JI_WOO, ME_ID, MIN_JUN } from './server';

// "만나고 싶다" (P02 ticket 24), against the fake main server.

export const MEET = '만나고 싶다';

// 민수 of board a5 as a Friend of the fake main server: the user id of 민수 in the stored answers, seen at the building
// level, without a position the map shows.
export const MIN_SU: Friend = {
  id: '35976b5c-4daf-454f-b10e-c8b09a33ca37',
  name: '김민수',
  department: '컴퓨터공학부',
  level: 'building',
  seen: 'building',
  sharing: true,
  visible: false,
  askedOff: false,
  askedPlan: false,
};

export function answerFriendsWithMinSu(server: FakeServer): void {
  server.on('GET /friends', { status: 200, body: [MIN_JUN, JI_WOO, MIN_SU] });
}

// The conditions the button asks with a Friend, as ticket 24 writes them, on the day the tests run in Korea (6 October
// 2026, `PHONE_NOW`).
export function meetWith(friendId: string): MeetInput {
  return {
    kind: 'meet',
    date: '2026-10-06',
    people: [
      { userId: ME_ID, constraints: [] },
      { userId: friendId, constraints: [] },
    ],
    window: { from: null, until: null },
    placeId: null,
  };
}

// The stored answer of a5 as the main server gives it to the meet asked with 민수: it holds the conditions it was
// asked, whose asker is the fake main server's User; the rest is the copy's.
export const MET_MIN_SU = { ...MEET_ANSWER, input: meetWith(MIN_SU.id) };

export function friendCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

export function pill(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-caption'));
}

// A Friend's row of the main screen's friend list.
export function row(friend: Friend): string {
  return `${friend.name} 지도에서 보기`;
}

type User = Awaited<ReturnType<typeof openMain>>;

// Presses "만나고 싶다" on the open card of a Friend, and waits for the answer.
export async function meetFromCard(user: User): Promise<void> {
  await user.press(friendCard().getByRole('button', { name: MEET }));
  await pass(500);
}
