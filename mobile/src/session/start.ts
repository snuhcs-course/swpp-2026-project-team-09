/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { QueryClient } from '@tanstack/react-query';
import { ApiError, isRefusal } from '@/api/errors';
import { lobbyQuery } from '@/api/queries';
import { suggestionOf } from '@/api/server/http';
import { asksMainServer } from '@/api/servers';
import { myUserId } from '@/auth/sign-in';
import { loadTokens } from '@/auth/tokens';
import { consentScreenAsks } from '@/consent/choices';
import { usageChosen } from '@/consent/kept-consent';
import { openKept } from '@/storage/kept';
import { allowUsage, identifyUser } from '@/telemetry';
import { behindConsent, type Opened } from './session';

// The work of the loading screen: reads what the phone keeps and, for a User who is signed in, whose copy of the
// account's consent holds the current version and who finished Onboarding, fetches the Lobby, so that the main screen
// opens with it. `onKeptRead` is called between the two.
//
// Where the app asks the main server, a User is signed in only with its tokens, and the main server's word on
// Onboarding is the one that counts: the Lobby is asked for whatever the phone kept, and a refusal with
// ONBOARDING_REQUIRED leads to Onboarding with the suggestion it carries.
export async function readStart(queryClient: QueryClient, onKeptRead: () => void): Promise<Opened> {
  const server = asksMainServer();
  const [{ signedIn, consent, consented, onboardingCompleted, suggestion }, tokens] = await Promise.all([
    openKept(),
    server ? loadTokens() : null,
  ]);
  onKeptRead();
  if (!signedIn || (server && tokens === null)) {
    return { status: 'signed-out', suggestion: null };
  }
  // A start with a kept Session: crash reports and usage data carry the User's id, and nothing else of the User. Usage
  // data is sent only when the phone's copy of the account's consent allows it.
  allowUsage(usageChosen(consent));
  identifyUser(myUserId());
  // The phone's copy of the account's consent decides, before the Lobby: a copy without the current version asks,
  // unless the phone kept the earlier consent, which is carried over first (`consentScreenAsks`).
  if (await consentScreenAsks(consent, consented)) {
    return behindConsent(
      onboardingCompleted ? { status: 'ready', suggestion: null } : { status: 'onboarding', suggestion },
      true,
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
