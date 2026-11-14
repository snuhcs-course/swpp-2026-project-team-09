/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Platform } from 'react-native';
import type * as PushDevice from '@/push/device';
import type * as SecureStoreFake from '../support/secure-store';
import type * as FakeSocketModule from '../support/fake-socket';
import type * as PushFake from '../support/push';
import { pass, screen, startApp } from '../support/app';
import { type FakeServer, refusal } from '../support/fake-server';
import { sockets } from '../support/fake-socket';
import { SIGN_IN } from '../support/live';
import { givePhone, ON_CAMPUS, openMain, type Phone } from '../support/main';
import { startFresh } from '../support/mocks';
import { givePushPhone, PHONE_TOKEN } from '../support/push';
import { REGISTER } from '../support/push-moments';
import { signIn, signOut } from '../support/sign-out';
import { answerMainScreen, askMainServer, PHONE_NOW } from '../support/server';
import { keep, readKeptAfterChanges } from '@/storage/kept';

// An unregistering from push owed since a Session ended, against the fake main server: the real push wrapper over a
// mocked `expo-notifications`.

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
jest.mock('@/push/device', () => jest.requireActual<typeof PushDevice>('@/push/device'));
jest.mock('expo', () => jest.requireActual<typeof PushFake>('../support/push').expoModule);
jest.mock('expo-notifications', () => jest.requireActual<typeof PushFake>('../support/push').notificationsModule);

let server: FakeServer;
let front: Phone;

beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on(REGISTER, { status: 204 });
  front = givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function registered(): unknown[] {
  return server.received(REGISTER).map(({ body }) => body);
}

describe('an unregistering that did not go through', () => {
  it('tries an unregistering that failed again when the app comes to the front signed out, until it goes through', async () => {
    const phone = givePushPhone({ permission: 'granted', unregisterFails: true });
    const user = await openMain();

    await signOut(user, server);
    expect((await readKeptAfterChanges()).pushUnregisterOwed).toBe(true);
    phone.letUnregisterWork();
    const failed = phone.unregisters();
    await front.comeToFront();

    expect(phone.unregisters()).toBe(failed + 1);
    expect((await readKeptAfterChanges()).pushUnregisterOwed).toBe(false);
    await front.comeToFront();
    expect(phone.unregisters()).toBe(failed + 1);
  });

  it('tries an unregistering owed from before at a start signed out', async () => {
    const phone = givePushPhone({ permission: 'granted' });
    await keep({ signedIn: false, pushUnregisterOwed: true });

    await startApp();
    await pass(1000);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(phone.unregisters()).toBe(1);
    expect((await readKeptAfterChanges()).pushUnregisterOwed).toBe(false);
  });
});

describe('a sign-in after an unregistering that did not go through', () => {
  it('unregisters the phone before a sign-in fetches its token, and owes nothing once it is registered', async () => {
    const phone = givePushPhone({ permission: 'granted', unregisterFails: true });
    const user = await openMain();
    await signOut(user, server);
    phone.letUnregisterWork();
    const fetched = phone.tokenFetches();
    const fetchesAtUnregister: number[] = [];
    phone.whenUnregistered(() => {
      fetchesAtUnregister.push(phone.tokenFetches());
    });

    await signIn(user, server);

    expect(fetchesAtUnregister).toEqual([fetched]);
    expect(registered()).toEqual([{ token: PHONE_TOKEN }, { token: PHONE_TOKEN }]);
    expect((await readKeptAfterChanges()).pushUnregisterOwed).toBe(false);
    await front.comeToFront();
    expect(fetchesAtUnregister).toEqual([fetched]);
  });

  it('registers after an owed unregistering still running when the sign-in ends', async () => {
    const phone = givePushPhone({ permission: 'granted', unregisterFails: true });
    const user = await openMain();
    await signOut(user, server);
    phone.letUnregisterWork();
    phone.holdUnregister();
    const fetched = phone.tokenFetches();
    const heldAt = Date.now();

    await front.comeToFront();
    await signIn(user, server);

    expect(Date.now() - heldAt).toBeLessThan(3000);
    expect(phone.tokenFetches()).toBe(fetched);
    expect(registered()).toHaveLength(1);
    await phone.letUnregisterGo();
    await pass(500);
    expect(phone.tokenFetches()).toBe(fetched + 1);
    expect(registered()).toEqual([{ token: PHONE_TOKEN }, { token: PHONE_TOKEN }]);
  });
});

describe('the registration after an unregistering that did not go through', () => {
  it('owes nothing once a sign-in registers the token, though the unregistering still fails', async () => {
    givePushPhone({ permission: 'granted', unregisterFails: true });
    const user = await openMain();
    await signOut(user, server);

    await signIn(user, server);

    expect(registered()).toHaveLength(2);
    expect((await readKeptAfterChanges()).pushUnregisterOwed).toBe(false);
  });

  it('still owes the unregistering after a sign-in whose registration the main server refuses', async () => {
    givePushPhone({ permission: 'granted', unregisterFails: true });
    const user = await openMain();
    await signOut(user, server);
    server.on(REGISTER, refusal(500));

    await signIn(user, server);

    expect(registered()).toHaveLength(2);
    expect((await readKeptAfterChanges()).pushUnregisterOwed).toBe(true);
  });
});
