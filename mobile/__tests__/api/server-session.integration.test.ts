/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import * as SecureStore from 'expo-secure-store';
import { type Received, refusal, type Reply } from '../support/fake-server';
import { startFresh } from '../support/mocks';
import {
  accessTokenOf,
  askMainServer,
  LIBRARY_POSITION,
  ME_ID,
  MIN_JUN,
  PHONE_NOW,
  RENEWED,
  TOKENS,
} from '../support/server';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { googleAvailable } from '@/auth/google';
import { myUserId } from '@/auth/sign-in';
import { heldTokens } from '@/auth/tokens';
import { now } from '@/clock';
import { listenToSession, type SessionEvent } from '@/session/session-events';
import { readKept } from '@/storage/kept';

// A request to the main server: the access token, the one renewal of the Session, and what ends the Session.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const BEARER = `Bearer ${TOKENS.accessToken}`;

// The events of the Session, as the screens would follow them.
let events: SessionEvent[] = [];
let stopListening = (): void => undefined;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
  events = [];
  stopListening = listenToSession((event) => {
    events.push(event);
  });
});

afterEach(() => {
  stopListening();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// A route that answers only the renewed access token, and refuses the first with 401.
function renewedOnly(body: unknown): (request: Received) => Reply {
  return (request) =>
    request.authorization === `Bearer ${RENEWED.accessToken}` ? { status: 200, body } : refusal(401);
}

describe('the one renewal of the Session', () => {
  it('renews the Session once on a 401, keeps the new tokens and asks again with them', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /friends', (request) =>
      request.authorization === `Bearer ${RENEWED.accessToken}` ? { status: 200, body: [MIN_JUN] } : refusal(401),
    );
    server.on('POST /auth/refresh', { status: 200, body: RENEWED });

    expect(await apiClient.listFriends()).toEqual([MIN_JUN]);
    expect(server.received('POST /auth/refresh').map(({ body, authorization }) => [body, authorization])).toEqual([
      [{ refreshToken: TOKENS.refreshToken }, null],
    ]);
    expect(server.received('GET /friends').map(({ authorization }) => authorization)).toEqual([
      BEARER,
      `Bearer ${RENEWED.accessToken}`,
    ]);
    expect(heldTokens()).toEqual(RENEWED);
    expect(await SecureStore.getItemAsync('snunow.access-token')).toBe(RENEWED.accessToken);
    expect(await SecureStore.getItemAsync('snunow.refresh-token')).toBe(RENEWED.refreshToken);
    expect(events).toEqual([]);
  });

  it('renews once for requests that are refused at the same moment', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /friends', renewedOnly([MIN_JUN]));
    server.on('GET /positions', renewedOnly([LIBRARY_POSITION]));
    server.on('POST /auth/refresh', { status: 200, body: RENEWED });

    expect(await Promise.all([apiClient.listFriends(), apiClient.listPositions()])).toEqual([
      [MIN_JUN],
      [LIBRARY_POSITION],
    ]);
    expect(server.received('POST /auth/refresh')).toHaveLength(1);
  });

  it('ends the Session when the request is refused again after the renewal', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /friends', refusal(401));
    server.on('POST /auth/refresh', { status: 200, body: RENEWED });

    await expect(apiClient.listFriends()).rejects.toMatchObject({ status: 401 });
    expect(server.received('POST /auth/refresh')).toHaveLength(1);
    expect(events).toEqual([{ kind: 'ended', replaced: false }]);
  });
});

describe('what the Session follows', () => {
  it('ends the Session when the renewal is refused, and the sign-in screen is shown', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /friends', refusal(401));
    server.on('POST /auth/refresh', refusal(401));

    await expect(apiClient.listFriends()).rejects.toMatchObject({ status: 401 });
    expect(events).toEqual([{ kind: 'ended', replaced: false }]);
    expect(heldTokens()).toBeNull();
    expect(await SecureStore.getItemAsync('snunow.refresh-token')).toBeNull();
    expect((await readKept()).signedIn).toBe(false);
  });

  it('ends a Session that a sign-in on another phone replaced, without a renewal', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /friends', refusal(401, 'SESSION_REPLACED'));

    await expect(apiClient.listFriends()).rejects.toMatchObject({ status: 401, code: 'SESSION_REPLACED' });
    expect(server.received('POST /auth/refresh')).toEqual([]);
    expect(events).toEqual([{ kind: 'ended', replaced: true }]);
    expect(heldTokens()).toBeNull();
  });

  it('takes the User to Onboarding with the suggestion a 403 ONBOARDING_REQUIRED carries', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(
      'GET /quests',
      refusal(403, 'ONBOARDING_REQUIRED', {
        onboarding: { completed: false, suggestion: { name: '홍길동', department: '컴퓨터공학부' } },
      }),
    );

    await expect(apiClient.listQuests()).rejects.toMatchObject({ status: 403, code: 'ONBOARDING_REQUIRED' });
    const suggestion = { name: '홍길동', department: '컴퓨터공학부' };
    expect(events).toEqual([{ kind: 'onboarding-required', suggestion }]);
    expect(await readKept()).toMatchObject({ onboardingCompleted: false, suggestion });
  });
});

describe('a request to the main server', () => {
  it('carries the access token', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /friends', { status: 200, body: [MIN_JUN] });

    expect(await apiClient.listFriends()).toEqual([MIN_JUN]);
    expect(server.received('GET /friends')).toEqual([
      { method: 'GET', path: '/friends', query: {}, authorization: BEARER, body: null },
    ]);
  });

  it('is a failure, and no end of the Session, when nothing answers', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /friends', 'no-answer');

    await expect(apiClient.listFriends()).rejects.toEqual(new ApiError(0));
    expect(events).toEqual([]);
    expect(heldTokens()).toEqual(TOKENS);
  });

  it('is a failure when the answer has another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /friends', { status: 200, body: [{ id: 'f1', name: '김민준' }] });

    await expect(apiClient.listFriends()).rejects.toMatchObject({ status: 0, code: 'UNEXPECTED_ANSWER' });
  });

  it('throws any other refusal as it came', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /parties', refusal(500));

    await expect(apiClient.listParties()).rejects.toMatchObject({ status: 500, code: null });
    expect(events).toEqual([]);
  });
});

describe("the app's own User and time", () => {
  it("are the access token's subject and the phone's clock", async () => {
    await askMainServer({ signedIn: true });

    expect(myUserId()).toBe(ME_ID);
    expect(now()).toEqual(PHONE_NOW);
    jest.advanceTimersByTime(60_000);
    expect(now().getTime() - PHONE_NOW.getTime()).toBe(60_000);
  });

  it('follow the renewed access token', async () => {
    const server = await askMainServer({ signedIn: true });
    const other = '11111111-2222-4333-8444-555555555555';
    server.on('GET /friends', (request) =>
      request.authorization === BEARER ? refusal(401) : { status: 200, body: [] },
    );
    server.on('POST /auth/refresh', { status: 200, body: { accessToken: accessTokenOf(other), refreshToken: 'r' } });

    await apiClient.listFriends();

    expect(myUserId()).toBe(other);
  });

  it("are the mock's where the app asks no main server", () => {
    expect(myUserId()).toBe('me');
    expect(now().toISOString()).toBe('2026-10-01T04:37:00.000Z');
  });
});
