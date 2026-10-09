/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-08  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import { MOCK_WAIT_MS } from '@/api/mock/answer';
import { ME } from '@/api/mock/data/frame';
import { isNothing, isSignInAnswer, type SignInAnswer } from '@/api/server/answers';
import { call } from '@/api/server/http';
import { asksMainServer } from '@/api/servers';
import type { Onboarding, SignInResult, Suggestion } from '@/api/types';
import { askGoogle, forgetGoogle, type GoogleAccountPrompt, googleAvailable } from '@/auth/google';
import { isSnuAccount, readIdToken, subjectOf } from '@/auth/id-token';
import { forgetTokens, heldTokens, keepTokens } from '@/auth/tokens';
import { namedSignInEnding, signInEnding } from '@/dev-settings';
import { keep, readKept } from '@/storage/kept';

// Sign-in lives behind these two operations. A build that holds Google's sign-in module asks Google which account.
// Where the app asks the main server (`asksMainServer()`), Google's ID token goes to the main server, whose answer says
// whether the account is an SNU one and whether the User finished Onboarding, and whose tokens the phone's secure
// storage keeps. A build that holds Google's module and has no main server's address checks the account's domain
// itself and sends the token nowhere. Everywhere else, in Expo Go, on the web and in the tests, and whenever a
// development setting names the ending, the sign-in is a mock: no Google sheet opens and no token exists. Without the
// main server the phone remembers that the User signed in, and nothing else.

// What the mock sign-in suggests to a User who has not finished Onboarding, as the main server reads it from the
// Google account. The department cannot always be read.
export const MOCK_SUGGESTION: Suggestion = { name: ME.name, department: null };

// Remembers on the phone that the User signed in, and what to suggest for Onboarding.
async function enter(suggestion: Suggestion): Promise<SignInResult> {
  // A User who finished Onboarding on this phone before has finished it, as an account on the main server has.
  const { onboardingCompleted } = await readKept();
  const onboarding: Onboarding = onboardingCompleted ? { completed: true } : { completed: false, suggestion };
  await keep({ signedIn: true, suggestion: onboarding.completed ? null : onboarding.suggestion });
  return { outcome: 'signed-in', onboarding };
}

// A Google account that could not be forgotten changes nothing for the User: the sheet lists every account anyway.
async function forgetGoogleQuietly(): Promise<void> {
  try {
    await forgetGoogle();
  } catch {
    // Nothing to do.
  }
}

// The main server's word in place of the app's own check. 403 is an account outside SNU, or one whose address Google
// has not verified; 401 is an ID token that the main server could not verify, and every other refusal and no answer
// are a failure too.
async function enterMainServer(idToken: string): Promise<SignInResult> {
  let answer: SignInAnswer;
  try {
    answer = await call('POST', '/auth/google', isSignInAnswer, { body: { idToken }, signedIn: false });
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      await forgetGoogleQuietly();
      return { outcome: 'not-snu-account' };
    }
    return { outcome: 'failed' };
  }
  await keepTokens({ accessToken: answer.accessToken, refreshToken: answer.refreshToken });
  const onboarding: Onboarding = answer.onboarding.completed
    ? { completed: true }
    : { completed: false, suggestion: answer.onboarding.suggestion ?? { name: null, department: null } };
  await keep({
    signedIn: true,
    onboardingCompleted: onboarding.completed,
    suggestion: onboarding.completed ? null : onboarding.suggestion,
  });
  return { outcome: 'signed-in', onboarding };
}

async function signInWithGoogle(way: GoogleAccountPrompt): Promise<SignInResult> {
  try {
    const answer = await askGoogle(way);
    if (answer.kind === 'cancelled') {
      return { outcome: 'cancelled' };
    }
    if (asksMainServer()) {
      return await enterMainServer(answer.idToken);
    }
    const account = readIdToken(answer.idToken);
    if (!isSnuAccount(account)) {
      await forgetGoogleQuietly();
      return { outcome: 'not-snu-account' };
    }
    return await enter({ name: account.name, department: null });
  } catch {
    return { outcome: 'failed' };
  }
}

async function signInWithMock(): Promise<SignInResult> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, MOCK_WAIT_MS);
  });
  const ending = signInEnding();
  if (ending !== 'signed-in') {
    return { outcome: ending };
  }
  return enter(MOCK_SUGGESTION);
}

// `way` is how Google is asked for the account; everything after its ID token is the same. The mock ignores it.
export function signIn(way: GoogleAccountPrompt = 'phone-accounts'): Promise<SignInResult> {
  return googleAvailable() && namedSignInEnding() === null ? signInWithGoogle(way) : signInWithMock();
}

// Ends the Session on the main server too. The User leaves whatever it answers: a Session it cannot end is over for
// this phone anyway once the tokens are forgotten.
async function signOutOfMainServer(): Promise<void> {
  if (heldTokens() === null) {
    return;
  }
  try {
    await call('POST', '/auth/sign-out', isNothing);
  } catch {
    // Nothing to do.
  }
  await forgetTokens();
}

export async function signOut(): Promise<void> {
  if (asksMainServer()) {
    await signOutOfMainServer();
  }
  await keep({ signedIn: false, suggestion: null });
  if (googleAvailable()) {
    await forgetGoogleQuietly();
  }
}

// The signed-in User's own id, by which the app finds the User among a Quest's Holders and a Party's members: the
// subject of the main server's access token, and the mock's fixed one where the app asks no main server.
export function myUserId(): string {
  if (!asksMainServer()) {
    return ME.id;
  }
  const accessToken = heldTokens()?.accessToken;
  return accessToken === undefined ? '' : (subjectOf(accessToken) ?? '');
}
