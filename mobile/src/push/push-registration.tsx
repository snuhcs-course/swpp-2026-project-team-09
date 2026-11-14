/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { apiClient } from '@/api/client';
import { asksMainServer } from '@/api/servers';
import { useSession } from '@/session/session';
import { keep, readKeptAfterChanges } from '@/storage/kept';
import { expoPushToken, onPushTokenChange, pushAvailable, unregisterPush } from './device';

// Whether this phone can be asked about push and registered: a signed-in build that asks the main server, with the
// notifications library's native part.
export function pushUsable(ready: boolean): boolean {
  // The iOS build has no push entitlement, so no push can arrive there.
  return ready && asksMainServer() && pushAvailable() && Platform.OS === 'android';
}

// Sends the phone's token to the main server. The token is null unless the permission is granted. A failure is left
// for the next start.
export async function registerPush(): Promise<void> {
  try {
    const token = await expoPushToken();
    if (token !== null) {
      await apiClient.registerPushToken(token);
    }
  } catch {
    // The next start tries again.
  }
}

// An unregistering that failed when a Session ended, tried again until it goes through.
async function unregisterIfOwed(): Promise<void> {
  if ((await readKeptAfterChanges()).pushUnregisterOwed && (await unregisterPush())) {
    await keep({ pushUnregisterOwed: false });
  }
}

// Registers the phone at every start and sign-in, and whenever its token changes. It never asks for the permission.
// Signed out, it tries an unregistering owed at a start and whenever the app comes back to the front.
export function PushRegistration(): null {
  const { status } = useSession();
  const usable = pushUsable(status === 'ready');
  const signedOut = status === 'signed-out' && pushUsable(true);
  useEffect((): (() => void) | void => {
    if (!signedOut) {
      return;
    }
    void unregisterIfOwed();
    const watch = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void unregisterIfOwed();
      }
    });
    return () => {
      watch.remove();
    };
  }, [signedOut]);
  useEffect((): (() => void) | void => {
    if (!usable) {
      return;
    }
    void registerPush();
    return onPushTokenChange(() => {
      void registerPush();
    });
  }, [usable]);
  return null;
}
