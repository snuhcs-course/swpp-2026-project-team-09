/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type * as SecureStoreFake from '../support/secure-store';
import * as SecureStore from 'expo-secure-store';
import { refusal } from '../support/fake-server';
import { idTokenOf } from '../support/id-token';
import { answered, startFresh } from '../support/mocks';
import { askMainServer, PHONE_NOW, TOKENS } from '../support/server';
import type { GoogleAnswer } from '@/auth/google';
import { askGoogle, forgetGoogle, googleAvailable } from '@/auth/google';
import { signIn, signOut } from '@/auth/sign-in';
import { heldTokens } from '@/auth/tokens';
import { keep, readKept } from '@/storage/kept';

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn<Promise<GoogleAnswer>, []>(),
  forgetGoogle: jest.fn<Promise<void>, []>(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const SNU_TOKEN = idTokenOf({ email: 'gildong@snu.ac.kr', hd: 'snu.ac.kr', name: '홍길동' });
const GMAIL_TOKEN = idTokenOf({ email: 'someone@gmail.com', name: 'Some One' });

function googleGives(idToken: string): void {
  jest.mocked(askGoogle).mockResolvedValue({ kind: 'token', idToken });
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(askGoogle).mockReset();
  jest.mocked(forgetGoogle).mockReset().mockResolvedValue();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('a sign-in that the main server lets in', () => {
  it("sends Google's ID token and keeps the main server's tokens in the phone's secure storage", async () => {
    const server = await askMainServer({ signedIn: false });
    googleGives(SNU_TOKEN);
    const suggestion = { name: '홍길동', department: '컴퓨터공학부' };
    server.on('POST /auth/google', {
      status: 200,
      body: { ...TOKENS, onboarding: { completed: false, suggestion } },
    });

    expect(await answered(signIn())).toEqual({ outcome: 'signed-in', onboarding: { completed: false, suggestion } });
    expect(server.received('POST /auth/google')).toEqual([
      { method: 'POST', path: '/auth/google', query: {}, authorization: null, body: { idToken: SNU_TOKEN } },
    ]);
    expect(heldTokens()).toEqual(TOKENS);
    expect(await SecureStore.getItemAsync('snunow.access-token')).toBe(TOKENS.accessToken);
    expect(await SecureStore.getItemAsync('snunow.refresh-token')).toBe(TOKENS.refreshToken);
    expect(await readKept()).toMatchObject({ signedIn: true, onboardingCompleted: false, suggestion });
  });

  it("takes the main server's word that the User finished Onboarding, over what the phone kept", async () => {
    const server = await askMainServer({ signedIn: false });
    googleGives(SNU_TOKEN);
    server.on('POST /auth/google', { status: 200, body: { ...TOKENS, onboarding: { completed: true } } });

    expect(await answered(signIn())).toEqual({ outcome: 'signed-in', onboarding: { completed: true } });
    expect(await readKept()).toMatchObject({ signedIn: true, onboardingCompleted: true, suggestion: null });
  });

  it("takes the main server's word that the User has not finished Onboarding, over what the phone kept", async () => {
    await keep({ onboardingCompleted: true });
    const server = await askMainServer({ signedIn: false });
    googleGives(SNU_TOKEN);
    server.on('POST /auth/google', {
      status: 200,
      body: { ...TOKENS, onboarding: { completed: false, suggestion: { name: null, department: null } } },
    });

    expect(await answered(signIn())).toEqual({
      outcome: 'signed-in',
      onboarding: { completed: false, suggestion: { name: null, department: null } },
    });
    expect((await readKept()).onboardingCompleted).toBe(false);
  });
});

describe('a sign-in that the main server refuses, or that does not reach it', () => {
  it("leaves the account's domain to the main server: its 403 is an account outside SNU", async () => {
    const server = await askMainServer({ signedIn: false });
    googleGives(GMAIL_TOKEN);
    server.on('POST /auth/google', refusal(403));

    expect(await answered(signIn())).toEqual({ outcome: 'not-snu-account' });
    expect(server.received('POST /auth/google')).toHaveLength(1);
    expect(forgetGoogle).toHaveBeenCalledTimes(1);
    expect(heldTokens()).toBeNull();
    expect((await readKept()).signedIn).toBe(false);
  });

  it("does not check the account's domain itself: the main server's yes counts", async () => {
    const server = await askMainServer({ signedIn: false });
    googleGives(GMAIL_TOKEN);
    server.on('POST /auth/google', { status: 200, body: { ...TOKENS, onboarding: { completed: true } } });

    expect((await answered(signIn())).outcome).toBe('signed-in');
  });

  it.each([
    ['refuses the ID token with 401', refusal(401)],
    ['fails', refusal(500)],
    ['does not answer', 'no-answer' as const],
    ['answers in another shape', { status: 200, body: { accessToken: 'a' } }],
  ])('ends in "failed" when the main server %s, and keeps nothing', async (_what, reply) => {
    const server = await askMainServer({ signedIn: false });
    googleGives(SNU_TOKEN);
    server.on('POST /auth/google', reply);

    expect(await answered(signIn())).toEqual({ outcome: 'failed' });
    expect(heldTokens()).toBeNull();
    expect((await readKept()).signedIn).toBe(false);
  });
});

describe('a sign-in that does not ask the main server', () => {
  it('sends nothing when the User closes the sheet', async () => {
    const server = await askMainServer({ signedIn: false });
    jest.mocked(askGoogle).mockResolvedValue({ kind: 'cancelled' });

    expect(await answered(signIn())).toEqual({ outcome: 'cancelled' });
    expect(server.received()).toEqual([]);
  });

  it('keeps the mock sign-in where the app asks no main server, as in Expo Go', async () => {
    const server = await askMainServer({ signedIn: false });
    jest.mocked(googleAvailable).mockReturnValue(false);

    expect((await answered(signIn())).outcome).toBe('signed-in');
    expect(askGoogle).not.toHaveBeenCalled();
    expect(server.received()).toEqual([]);
  });
});

describe('a sign-out against the main server', () => {
  it('ends the Session there and forgets the tokens', async () => {
    const server = await askMainServer({ signedIn: true });
    await keep({ signedIn: true });
    server.on('POST /auth/sign-out', { status: 204 });

    await signOut();

    expect(server.received('POST /auth/sign-out').map(({ authorization }) => authorization)).toEqual([
      `Bearer ${TOKENS.accessToken}`,
    ]);
    expect(heldTokens()).toBeNull();
    expect(await SecureStore.getItemAsync('snunow.access-token')).toBeNull();
    expect((await readKept()).signedIn).toBe(false);
    expect(forgetGoogle).toHaveBeenCalledTimes(1);
  });

  it('signs out on the phone when the main server does not answer', async () => {
    const server = await askMainServer({ signedIn: true });
    await keep({ signedIn: true });
    server.on('POST /auth/sign-out', 'no-answer');

    await signOut();

    expect(heldTokens()).toBeNull();
    expect((await readKept()).signedIn).toBe(false);
  });
});
