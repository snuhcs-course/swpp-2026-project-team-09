/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { fireEvent } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { type FakeClient, fakePostHog } from './support/posthog';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW } from './support/server';

// Usage data as the app sends it over the fake main server, with the PostHog stand-in (P08 ticket 12): a User who
// chose it sends app_opened; 내 정보's "사용 기록 보내기" turned off drops what waits unsent at once,
// before the account answers, and sends nothing more; turned on, it sends again. The layer keeps its client for the
// whole file, as a run of the app does, so the User who chose no comes first.

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
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const SWITCH = '사용 기록 보내기';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  process.env.EXPO_PUBLIC_POSTHOG_TOKEN = 'phc_test';
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_POSTHOG_TOKEN;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openMe(usage: boolean): Promise<void> {
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, consent: { version: 1, usage } } });
  const user = await openMain({ consent: { version: 1, usage } });
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
}

// The events but the failed requests, which the fake main server's unset routes give (P08 ticket 13).
function opened(client: FakeClient): string[] {
  return client.events().filter((event) => event !== 'api_request_failed');
}

async function turn(on: boolean): Promise<void> {
  await fireEvent(screen.getByRole('switch', { name: SWITCH }), 'valueChange', on);
}

it('sends nothing for a User who chose no', async () => {
  await openMe(false);
  expect(fakePostHog().clients).toEqual([]);
});

it('drops what waits unsent when the switch is turned off, and sends again when it is turned on', async () => {
  server.on('PUT /users/me/usage-consent', { status: 204, afterMs: 2000 });
  await openMe(true);
  const [client] = fakePostHog().clients;
  if (client === undefined) {
    throw new Error('The layer made no PostHog client');
  }
  // The test app's root layout has no `RouteBreadcrumb`, so no screen is sent here (`usage-events.unit.test.ts`).
  expect(opened(client)).toEqual(['app_opened']);
  expect(client.queue.length).toBeGreaterThan(0);

  // Off holds before the account answers.
  await turn(false);
  expect(client.calls).toContainEqual(['optOut']);
  expect(client.queue).toEqual([]);
  await pass(2500);
  await client.flush();
  expect(client.sent).toEqual([]);

  await turn(true);
  await pass(2500);
  expect(client.calls.slice(-3).map(([method]) => method)).toEqual(['optIn', 'identify', 'capture']);
  expect(opened(client)).toEqual(['app_opened']);
});
