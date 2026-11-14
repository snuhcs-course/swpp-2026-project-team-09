/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as PushDevice from '@/push/device';
import type * as SecureStoreFake from '../support/secure-store';
import type * as FakeSocketModule from '../support/fake-socket';
import type * as PushFake from '../support/push';
import { pass, screen } from '../support/app';
import { type FakeServer, refusal, startFakeServer } from '../support/fake-server';
import { sockets } from '../support/fake-socket';
import { openLive, SIGN_IN, socketServer } from '../support/live';
import { givePhone, ON_CAMPUS, openMain } from '../support/main';
import { startFresh } from '../support/mocks';
import { CHANGED_TOKEN, givePushPhone, PHONE_TOKEN } from '../support/push';
import { REGISTER } from '../support/push-moments';
import { signIn, signOut } from '../support/sign-out';
import { answerMainScreen, askMainServer, PHONE_NOW } from '../support/server';
import { heldTokens } from '@/auth/tokens';

// The phone's registration for push against the fake main server: the real push wrapper over a mocked
// `expo-notifications`.

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

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on(REGISTER, { status: 204 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function registered(): unknown[] {
  return server.received(REGISTER).map(({ body }) => body);
}

describe('the registration with the permission granted', () => {
  it("sends the phone's token once the Session is ready", async () => {
    givePushPhone({ permission: 'granted' });

    await openMain();

    expect(registered()).toEqual([{ token: PHONE_TOKEN }]);
  });

  it('sends it again after a sign-out and a sign-in', async () => {
    givePushPhone({ permission: 'granted' });
    const user = await openMain();

    await signOut(user, server);
    expect(registered()).toHaveLength(1);
    await signIn(user, server);

    expect(registered()).toEqual([{ token: PHONE_TOKEN }, { token: PHONE_TOKEN }]);
  });

  it('sends the new token when the phone says its token changed', async () => {
    const phone = givePushPhone({ permission: 'granted' });
    await openMain();

    await phone.changeToken(CHANGED_TOKEN);

    expect(registered()).toEqual([{ token: PHONE_TOKEN }, { token: CHANGED_TOKEN }]);
  });

  it('lets the app go on when the main server refuses the token', async () => {
    server.on(REGISTER, refusal(500));
    givePushPhone({ permission: 'granted' });

    await openMain();

    expect(registered()).toHaveLength(1);
    expect(screen.getByRole('tab', { name: /^지도/u })).toBeSelected();
  });
});

describe('no registration', () => {
  it.each(['undetermined', 'denied'] as const)('sends nothing at start with the permission %s', async (permission) => {
    const phone = givePushPhone({ permission });

    await openMain();

    expect(registered()).toEqual([]);
    expect(phone.prompts()).toBe(0);
  });

  it('reads no permission and sends nothing without the native module', async () => {
    const phone = givePushPhone({ native: false, permission: 'granted' });

    await openMain();

    expect(phone.permissionReads()).toBe(0);
    expect(registered()).toEqual([]);
  });

  it('reads no permission and sends nothing in a mock build', async () => {
    await startFresh();
    server = startFakeServer();
    const phone = givePushPhone({ permission: 'granted' });

    await openMain();

    expect(phone.permissionReads()).toBe(0);
    expect(server.received()).toEqual([]);
  });
});

describe('the end of the Session on the phone', () => {
  it('unregisters the phone from push once at a sign-out', async () => {
    const phone = givePushPhone({ permission: 'granted' });
    const user = await openMain();

    const held: boolean[] = [];
    phone.whenUnregistered(() => {
      held.push(heldTokens() !== null);
    });

    await signOut(user, server);

    expect(phone.unregisters()).toBe(1);
    // Before the tokens are forgotten.
    expect(held).toEqual([true]);
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });

  it('unregisters it also when the main server fails the sign-out', async () => {
    const phone = givePushPhone({ permission: 'granted' });
    const user = await openMain();

    await signOut(user, server, 'no-answer');

    expect(server.received('POST /auth/sign-out')).toHaveLength(1);
    expect(phone.unregisters()).toBe(1);
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });

  it('unregisters it when the main server ends the Session with a 401', async () => {
    const phone = givePushPhone({ permission: 'granted' });
    const socket = await openLive();
    server.on('GET /quests', refusal(401, 'SESSION_REPLACED'));

    await socketServer(() => {
      socket.send('quests-changed');
    });
    await pass(500);

    expect(phone.unregisters()).toBe(1);
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });
});
