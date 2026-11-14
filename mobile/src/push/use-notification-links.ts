/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { readCardAddress } from './card-address';
import { clearLastPushTap, lastPushTap, onPushTap } from './device';

// A tapped push opens the address in its data once the User is here, as Invite Links do: the tap that started the
// app, and each tap while it runs. At a cold start the same tap can come both ways; its identifier lets it open once.
export function useNotificationLinks(here: boolean): void {
  const handled = useRef<string | null>(null);
  useEffect((): (() => void) | void => {
    if (!here) {
      return;
    }
    const open = (response: NotificationResponse | null): void => {
      if (response === null) {
        return;
      }
      const { identifier, content } = response.notification.request;
      const address = readCardAddress(content.data?.url);
      if (address === null || identifier === handled.current) {
        return;
      }
      handled.current = identifier;
      // Not `dismissTo`: on the tabs it reaches the tab navigator, which ignores it. `navigate` also closes the
      // screens above the tabs.
      router.navigate({ pathname: '/main', params: { card: `${address.kind}:${address.id}` } });
      clearLastPushTap();
    };
    open(lastPushTap());
    return onPushTap(open);
  }, [here]);
}
