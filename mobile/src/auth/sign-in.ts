import { MOCK_WAIT_MS } from '@/api/mock/answer';
import { ME } from '@/api/mock/data/frame';
import type { Onboarding, SignInResult, Suggestion } from '@/api/types';
import { askGoogle, forgetGoogle, googleAvailable } from '@/auth/google';
import { isSnuAccount, readIdToken } from '@/auth/id-token';
import { namedSignInEnding, signInEnding } from '@/dev-settings';
import { keep, readKept } from '@/storage/kept';

// Sign-in lives behind these two operations. A build that holds Google's sign-in module asks Google which account,
// and the app itself checks that it is an SNU one. Everywhere else, in Expo Go, on the web and in the tests, and
// whenever a development setting names the ending, the sign-in is a mock: no Google sheet opens and no token exists.
// Either way nothing is sent to the main server yet and no token is kept: the phone remembers that the User signed
// in. The last ticket of P06 sends Google's ID token to the main server behind the same two operations.

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

async function signInWithGoogle(): Promise<SignInResult> {
  try {
    const answer = await askGoogle();
    if (answer.kind === 'cancelled') {
      return { outcome: 'cancelled' };
    }
    const account = readIdToken(answer.idToken);
    if (!isSnuAccount(account)) {
      await forgetGoogleQuietly();
      return { outcome: 'not-snu-account' };
    }
    const result = await enter({ name: account.name, department: null });
    return result;
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

export function signIn(): Promise<SignInResult> {
  return googleAvailable() && namedSignInEnding() === null ? signInWithGoogle() : signInWithMock();
}

export async function signOut(): Promise<void> {
  await keep({ signedIn: false, suggestion: null });
  if (googleAvailable()) {
    await forgetGoogleQuietly();
  }
}

// The signed-in User's own id, by which the app finds the User among a Quest's Holders and a Party's members. The
// mock's User has a fixed one; with the main server it is read from the access token.
export function myUserId(): string {
  return ME.id;
}
