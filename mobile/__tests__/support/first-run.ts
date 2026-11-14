/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './app';
import { type FakeServer, refusal } from './fake-server';
import { SAVE } from './onboarding';
import { LOBBY } from './server';
import type { WatchedInterest } from '@/api/interest-types';
import type { Friend, TimetableClass } from '@/api/types';
import { keep } from '@/storage/kept';

// The first run's three cards over the fake main server (P05 ticket 09): what the main server answers a User who
// signs in for the first time, and the steps through Onboarding to the cards.

export type User = ReturnType<typeof userEvent.setup>;

export const TIMETABLE = '시간표부터 넣어 주세요';
export const INTERESTS = '무엇에 관심이 있어요?';
export const FRIEND = '친구 한 명을 불러 보세요';
export const HINT = '관심을 맡기면 맞는 행사를 알려 드려요';

export const OPERATING_SYSTEMS: TimetableClass = {
  id: 'c1',
  courseName: '운영체제',
  times: [{ id: 't1', weekday: 'saturday', startTime: '13:00', endTime: '14:00', placeId: null, room: null }],
  overlaps: [],
};

export function interestOf(words: string, index: number): WatchedInterest {
  return { id: `interest-${index}`, words, topics: [words], createdAt: '2026-10-06T04:00:00.000Z' };
}

// What the main server holds of the User, which its routes answer and a test changes.
export interface Held {
  onboarded: boolean;
  classes: TimetableClass[];
  interests: WatchedInterest[];
  friends: Friend[];
}

// The words of `POST /interests`.
function wordsOf(body: unknown): string {
  const words: unknown = typeof body === 'object' && body !== null ? Reflect.get(body, 'words') : undefined;
  return typeof words === 'string' ? words : '';
}

// A User who has not finished Onboarding, with no Class, no interest, and no Friend. `POST /interests` keeps the
// words.
export function answerFirstRun(server: FakeServer): Held {
  const held: Held = { onboarded: false, classes: [], interests: [], friends: [] };
  server.on('POST /lobby', () =>
    held.onboarded
      ? { status: 200, body: LOBBY }
      : refusal(403, 'ONBOARDING_REQUIRED', {
          onboarding: { completed: false, suggestion: { name: '홍길동', department: '컴퓨터공학부' } },
        }),
  );
  server.on('POST /users/me/onboarding', () => {
    held.onboarded = true;
    return { status: 204 };
  });
  server.on('GET /timetable/classes', () => ({ status: 200, body: held.classes }));
  server.on('GET /places', { status: 200, body: [] });
  server.on('GET /interests', () => ({ status: 200, body: held.interests }));
  server.on('GET /friends', () => ({ status: 200, body: held.friends }));
  server.on('POST /interests', (request) => {
    const kept = interestOf(wordsOf(request.body), held.interests.length);
    held.interests = [kept, ...held.interests];
    return { status: 201, body: kept };
  });
  return held;
}

// The User finishes Onboarding on this phone and lands on the map.
export async function finishOnboarding(): Promise<User> {
  await keep({ signedIn: true, consented: true, onboardingCompleted: true });
  await startApp();
  await pass(1000);
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: SAVE }));
  await pass(1000);
  await pass(500);
  return user;
}

// The titles of the first run's cards on screen.
export function cardsShown(): string[] {
  return [TIMETABLE, INTERESTS, FRIEND].filter((title) => screen.queryByRole('header', { name: title }) !== null);
}

export async function later(user: User): Promise<void> {
  await user.press(screen.getByRole('button', { name: '나중에' }));
  await pass(500);
}
