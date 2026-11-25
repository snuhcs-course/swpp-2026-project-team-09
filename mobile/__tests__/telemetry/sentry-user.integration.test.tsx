/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import type * as FakeSocketModule from '../support/fake-socket';
import { userEvent } from '@testing-library/react-native';
import type { FakeServer } from '../support/fake-server';
import { sockets } from '../support/fake-socket';
import { pass, startApp } from '../support/app';
import { openLive, socketServer } from '../support/live';
import { givePhone, ON_CAMPUS, openMain } from '../support/main';
import { startFresh } from '../support/mocks';
import { answerMainScreen, askMainServer, ME_ID, PHONE_NOW } from '../support/server';
import { fakeSentry } from '../support/sentry';
import { signIn, signOut } from '../support/sign-out';
import { startTelemetry } from '@/telemetry';

// Sentry's user follows the Session, in a build that asks the main server and carries a DSN: the User's id alone at a
// sign-in and at a start with a kept Session, and nothing once the User signed out or the main server ended the
// Session.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('../support/fake-socket'));

let server: FakeServer;

beforeAll(async () => {
  // Not a real project's key: the stand-in sends nothing.
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@o0.ingest.us.sentry.io/0';
  await startTelemetry();
});

afterAll(() => {
  delete process.env.EXPO_PUBLIC_SENTRY_DSN;
});

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  fakeSentry().setUser.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Every user Sentry was given: the User's id alone, or none.
function usersGiven(): unknown[] {
  return fakeSentry().setUser.mock.calls.map(([user]) => user);
}

it("is the User's id alone after a sign-in", async () => {
  server = await askMainServer({ signedIn: false });
  answerMainScreen(server);
  await startApp();
  await pass(1000);

  await signIn(userEvent.setup({ advanceTimers: jest.advanceTimersByTime }), server);

  expect(usersGiven()).toEqual([{ id: ME_ID }]);
});

it("is the User's id alone at a start with a kept Session", async () => {
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);

  await openMain();

  expect(usersGiven()).toEqual([{ id: ME_ID }]);
});

it('is cleared by a sign-out', async () => {
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  const user = await openMain();

  await signOut(user, server);

  expect(usersGiven()).toEqual([{ id: ME_ID }, null]);
});

it('is cleared when the main server ended the Session', async () => {
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  const socket = await openLive();

  await socketServer(() => {
    socket.send('session-ended', { code: 'SESSION_REPLACED' });
  });
  await pass(500);

  expect(usersGiven()).toEqual([{ id: ME_ID }, null]);
});
