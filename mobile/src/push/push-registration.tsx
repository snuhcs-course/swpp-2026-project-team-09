/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
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

// An unregistering that failed when a Session ended, tried again until it goes through. One runs at a time.
let unregistering: Promise<void> | null = null;

async function unregisterOwed(): Promise<void> {
  if ((await readKeptAfterChanges()).pushUnregisterOwed && (await unregisterPush())) {
    await keep({ pushUnregisterOwed: false });
  }
}

function unregisterIfOwed(): Promise<void> {
  unregistering ??= unregisterOwed().finally(() => {
    unregistering = null;
  });
  return unregistering;
}

// Whether the ready Session's token reached the main server in this run of the app, and whether a registration runs.
let registered = false;
let registering = false;

// Sends the phone's token to the main server. The token is null unless the permission is granted. A failure is tried
// again when the app comes back to the front.
export async function registerPush(): Promise<void> {
  registering = true;
  try {
    // An unregistering finishing later would delete the token fetched here.
    await unregisterIfOwed();
    const token = await expoPushToken();
    if (token !== null) {
      await apiClient.registerPushToken(token);
      registered = true;
      // The main server moved the token to this Session, so nothing of the earlier one reaches the phone.
      if ((await readKeptAfterChanges()).pushUnregisterOwed) {
        await keep({ pushUnregisterOwed: false });
      }
    }
  } catch {
    // Tried again when the app comes back to the front.
  } finally {
    registering = false;
  }
}

// Registers the phone at every start and sign-in, whenever its token changes, and when the app comes back to the front
// while that has not gone through yet (a failure, or notifications allowed later in the phone's settings). It never
// asks for the permission.
// Before the Session is ready, it tries an unregistering owed at a start and whenever the app comes back to the front.
export function PushRegistration(): null {
  const { status } = useSession();
  const usable = pushUsable(status === 'ready');
  const notReady = status !== 'loading' && status !== 'ready' && pushUsable(true);
  useEffect((): (() => void) | void => {
    if (!notReady) {
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
  }, [notReady]);
  useEffect((): (() => void) | void => {
    if (!usable) {
      return;
    }
    registered = false;
    void registerPush();
    const stopTokenWatch = onPushTokenChange(() => {
      void registerPush();
    });
    const watch = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !registered && !registering) {
        void registerPush();
      }
    });
    return () => {
      stopTokenWatch();
      watch.remove();
    };
  }, [usable]);
  return null;
}
