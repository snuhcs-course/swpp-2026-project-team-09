/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './support/app';
import type { FakeServer, Reply } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { idTokenOf } from './support/id-token';
import { SIGN_IN } from './support/live';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, LOBBY, PHONE_NOW, TOKENS } from './support/server';
import { askGoogle } from '@/auth/google';
import { dropHeldTokens } from '@/auth/tokens';
import { keep, readKept } from '@/storage/kept';

// A User who agreed on this phone before the account kept a consent (`consented: true`) is not asked again (P08
// ticket 11, the owner's decision of 2026-11-26): the app sends the current version with usage data off, quietly,
// and goes on; a failed send is tried again at the next start.

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

const TITLE = '약관에 동의해 주세요';
const NO_CONSENT = { version: null, usage: null };

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// A start of the app with a kept Session, on a phone that kept the earlier consent, the main server answering the
// consent with `reply`.
async function startOldPhone(reply: Reply): Promise<void> {
  await keep({ signedIn: true, consented: true, onboardingCompleted: true });
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('PUT /users/me/consent', reply);
  // The account as it holds the consent after the send: none when it failed.
  const held = reply === 'no-answer' || reply.status >= 400 ? NO_CONSENT : { version: 1, usage: false };
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, consent: held } });
  await startApp();
  await pass(1000);
  await pass(1000);
}

function consentSent(): unknown[] {
  return server.received('PUT /users/me/consent').map(({ body }) => body);
}

it('opens the main screen without the consent screen, and the account holds version 1 with usage data off', async () => {
  await startOldPhone({ status: 204 });

  expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
  expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
  expect(consentSent()).toEqual([{ version: 1, usage: false }]);
  expect(await readKept()).toMatchObject({ consented: false, consent: { version: 1, usage: false } });
});

it('opens the main screen after a failed send too, keeps usage data off, and sends again at the next start', async () => {
  await startOldPhone('no-answer');

  expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
  expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
  expect(await readKept()).toMatchObject({ consented: true, consent: NO_CONSENT });

  await screen.unmount();
  dropHeldTokens();
  server.on('PUT /users/me/consent', { status: 204 });
  server.on('POST /lobby', { status: 200, body: LOBBY });
  await startApp();
  await pass(1000);
  await pass(1000);
  expect(consentSent()).toEqual([
    { version: 1, usage: false },
    { version: 1, usage: false },
  ]);
  expect(await readKept()).toMatchObject({ consented: false, consent: { version: 1, usage: false } });
});

it('is not asked after a sign-in either, when the account holds no version', async () => {
  await keep({ consented: true });
  server = await askMainServer({ signedIn: false });
  answerMainScreen(server);
  server.on('PUT /users/me/consent', { status: 204 });
  server.on('POST /auth/google', {
    status: 200,
    body: { ...TOKENS, onboarding: { completed: true }, consent: NO_CONSENT },
  });
  jest.mocked(askGoogle).mockResolvedValue({
    kind: 'token',
    idToken: idTokenOf({ email: 'gildong@snu.ac.kr', hd: 'snu.ac.kr', name: '홍길동' }),
  });
  await startApp();
  await pass(1000);
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.press(screen.getByRole('button', { name: SIGN_IN }));
  await pass(1000);
  await pass(1000);

  expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
  expect(consentSent()).toEqual([{ version: 1, usage: false }]);
});
