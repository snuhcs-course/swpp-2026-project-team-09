/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { Suggestion } from '@/api/types';
import { forgetTokens } from '@/auth/tokens';
import { keep } from '@/storage/kept';

// What the main server or the socket server says about the Session in the middle of anything, which the session's
// provider follows: the Session ended, or the User has to finish Onboarding first. An end is `replaced` when a sign-in
// on another phone ended it, which the app tells the User.
export type SessionEvent =
  { kind: 'ended'; replaced: boolean } | { kind: 'onboarding-required'; suggestion: Suggestion };

type Listener = (event: SessionEvent) => void;

const listeners = new Set<Listener>();

export function listenToSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function announce(event: SessionEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

// The Session is over: the tokens are forgotten, the phone no longer keeps that the User signed in, and the screens
// show the sign-in screen.
export async function endSession(replaced: boolean): Promise<void> {
  await forgetTokens();
  await keep({ signedIn: false, suggestion: null });
  announce({ kind: 'ended', replaced });
}

// The main server refused a request because the User has not finished Onboarding, as it does when a User finished it
// on no phone yet. The phone keeps the main server's word and its suggestion.
export async function requireOnboarding(suggestion: Suggestion): Promise<void> {
  await keep({ onboardingCompleted: false, suggestion });
  announce({ kind: 'onboarding-required', suggestion });
}
