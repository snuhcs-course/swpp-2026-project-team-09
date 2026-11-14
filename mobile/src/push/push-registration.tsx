/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useEffect } from 'react';
import { apiClient } from '@/api/client';
import { asksMainServer } from '@/api/servers';
import { useSession } from '@/session/session';
import { expoPushToken, onPushTokenChange, pushAvailable } from './device';

// Whether this phone can be asked about push and registered: a signed-in build that asks the main server, with the
// notifications library's native part.
export function pushUsable(ready: boolean): boolean {
  return ready && asksMainServer() && pushAvailable();
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

// Registers the phone at every start and sign-in, and whenever its token changes. It never asks for the permission.
export function PushRegistration(): null {
  const usable = pushUsable(useSession().status === 'ready');
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
