/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { QueryClient } from '@tanstack/react-query';
import { ApiError, isRefusal } from '@/api/errors';
import { lobbyQuery } from '@/api/queries';
import { suggestionOf } from '@/api/server/http';
import { asksMainServer } from '@/api/servers';
import { loadTokens } from '@/auth/tokens';
import { openKept } from '@/storage/kept';
import { behindConsent, type Opened } from './session';

// The work of the loading screen: reads what the phone keeps and, for a User who is signed in, agreed to the legal
// documents and finished Onboarding, fetches the Lobby, so that the main screen opens with it. `onKeptRead` is called
// between the two.
//
// Where the app asks the main server, a User is signed in only with its tokens, and the main server's word on
// Onboarding is the one that counts: the Lobby is asked for whatever the phone kept, and a refusal with
// ONBOARDING_REQUIRED leads to Onboarding with the suggestion it carries.
export async function readStart(queryClient: QueryClient, onKeptRead: () => void): Promise<Opened> {
  const server = asksMainServer();
  const [{ signedIn, consented, onboardingCompleted, suggestion }, tokens] = await Promise.all([
    openKept(),
    server ? loadTokens() : null,
  ]);
  onKeptRead();
  if (!signedIn || (server && tokens === null)) {
    return { status: 'signed-out', suggestion: null };
  }
  if (!consented) {
    return behindConsent(
      onboardingCompleted ? { status: 'ready', suggestion: null } : { status: 'onboarding', suggestion },
      consented,
    );
  }
  if (!onboardingCompleted && !server) {
    return { status: 'onboarding', suggestion };
  }
  try {
    await queryClient.query(lobbyQuery);
  } catch (error) {
    // The main server's word on Onboarding is the last one.
    if (isRefusal(error, 403, 'ONBOARDING_REQUIRED')) {
      return {
        status: 'onboarding',
        suggestion: error instanceof ApiError && server ? suggestionOf(error) : suggestion,
      };
    }
    // A Session that the main server no longer knows is over: the User signs in again.
    if (error instanceof ApiError && error.status === 401) {
      return { status: 'signed-out', suggestion: null };
    }
    throw error;
  }
  return { status: 'ready', suggestion: null };
}
