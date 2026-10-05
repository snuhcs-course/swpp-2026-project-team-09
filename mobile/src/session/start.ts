import type { QueryClient } from '@tanstack/react-query';
import { ApiError, isRefusal } from '@/api/errors';
import { lobbyQuery } from '@/api/queries';
import { openKept } from '@/storage/kept';
import { behindConsent, type Opened } from './session';

// The work of the loading screen: reads what the phone keeps and, for a User who is signed in, agreed to the legal
// documents and finished Onboarding, fetches the Lobby, so that the main screen opens with it. `onKeptRead` is called between the two.
export async function readStart(queryClient: QueryClient, onKeptRead: () => void): Promise<Opened> {
  const { signedIn, consented, onboardingCompleted, suggestion } = await openKept();
  onKeptRead();
  if (!signedIn) {
    return { status: 'signed-out', suggestion: null };
  }
  if (!onboardingCompleted) {
    return behindConsent({ status: 'onboarding', suggestion }, consented);
  }
  if (!consented) {
    return behindConsent({ status: 'ready', suggestion: null }, consented);
  }
  try {
    await queryClient.query(lobbyQuery);
  } catch (error) {
    // The main server's word on Onboarding is the last one.
    if (isRefusal(error, 403, 'ONBOARDING_REQUIRED')) {
      return { status: 'onboarding', suggestion };
    }
    // A Session that the main server no longer knows is over: the User signs in again.
    if (error instanceof ApiError && error.status === 401) {
      return { status: 'signed-out', suggestion: null };
    }
    throw error;
  }
  return { status: 'ready', suggestion: null };
}
