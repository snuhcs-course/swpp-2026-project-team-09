/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { clearInitialURL, getLinkingURL } from 'expo-linking';
import type { NativeIntent } from 'expo-router';
import { Platform } from 'react-native';
import { keep } from '@/storage/kept';

// The token of an Invite Link in each address that opens the app: `https://<host>/invite/<token>`,
// `snunow://invite/<token>`, and the router's path.
function inviteTokenOf(address: string): string | null {
  const path = address.replace(/^snunow:\/\//u, '/').replace(/^https:\/\/[^/]+/u, '');
  return /^\/+invite\/([^/?#]+)/u.exec(path)?.[1] ?? null;
}

// An Invite Link that starts the app keeps its token on the phone here, before the router renders a screen, and the
// signed-in place opens its accept screen once the User is there. The signed-in place cannot keep it itself at that
// start on Android: the router gets the address there as a promise and renders first without it, and starts at `/`
// when React Native answers after 150 ms. So on Android the address is read from expo-linking, which holds it for as
// long as the process lives and replaces it with each link opened while the app runs. It is cleared at every address,
// so that a later start of the screens in the same process does not open an old link again. A link opened while the
// app runs is the signed-in place's. The address goes on unchanged.
export function redirectSystemPath({
  path,
  initial,
}: Parameters<NonNullable<NativeIntent['redirectSystemPath']>>[0]): string {
  let address = path;
  if (Platform.OS === 'android') {
    address = (initial ? getLinkingURL() : null) ?? path;
    clearInitialURL();
  }
  const token = initial ? inviteTokenOf(address) : null;
  if (token !== null) {
    void keep({ inviteToken: token });
  }
  return path;
}
