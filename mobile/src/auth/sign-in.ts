import { MOCK_WAIT_MS } from '@/api/mock/answer';
import { ME } from '@/api/mock/data/frame';
import type { Onboarding, SignInResult, Suggestion } from '@/api/types';
import { signInEnding } from '@/dev-settings';
import { keep, readKept } from '@/storage/kept';

// Sign-in lives behind these two operations. For now both are mocks: no Google sheet opens and no token exists. The
// mock remembers on the phone that the User signed in, and the last ticket of P06 puts Google and the main server
// behind the same two operations.

// What the mock sign-in suggests to a User who has not finished Onboarding, as the main server reads it from the
// Google account. The department cannot always be read.
export const MOCK_SUGGESTION: Suggestion = { name: ME.name, department: null };

export async function signIn(): Promise<SignInResult> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, MOCK_WAIT_MS);
  });
  const ending = signInEnding();
  if (ending !== 'signed-in') {
    return { outcome: ending };
  }
  // A User who finished Onboarding on this phone before has finished it, as an account on the main server has.
  const { onboardingCompleted } = await readKept();
  const onboarding: Onboarding = onboardingCompleted
    ? { completed: true }
    : { completed: false, suggestion: MOCK_SUGGESTION };
  await keep({ signedIn: true, suggestion: onboarding.completed ? null : onboarding.suggestion });
  return { outcome: 'signed-in', onboarding };
}

export async function signOut(): Promise<void> {
  await keep({ signedIn: false, suggestion: null });
}

// The signed-in User's own id, by which the app finds the User among a Quest's Holders and a Party's members. The
// mock's User has a fixed one; with the main server it is read from the access token.
export function myUserId(): string {
  return ME.id;
}
