/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import type { CardAddress } from './card-address';

// The card that a row of 알림 or a tapped push asks the main screen to open, `<kind>:<id>`, until the main screen has
// opened it. It is handed over here rather than as `/main`'s `card` parameter: going back down to the tabs with a
// parameter leaves it on the tab navigator's route, and it then follows into the next tab's address (P06 ticket 63).
let asked: string | null = null;
const listeners = new Set<() => void>();

function tell(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The card asked of the main screen, or null.
export function useAskedCardAddress(): string | null {
  return useSyncExternalStore(subscribe, () => asked);
}

// Forgets the card asked, once the main screen has opened it.
export function forgetAskedCard(): void {
  if (asked !== null) {
    asked = null;
    tell();
  }
}

// Opens a card on the map in one move: while a screen lies above the tabs, the stack goes back down to them with the
// map in front, so that the screen under it, such as 내 정보 under 알림, never shows; otherwise the tabs go to the map.
// `navigate` from a screen above the tabs would push a second tab navigator over it instead.
export function openCard({ kind, id }: CardAddress): void {
  asked = `${kind}:${id}`;
  tell();
  if (router.canDismiss()) {
    router.dismissTo('/main');
  } else {
    router.navigate('/main');
  }
}
