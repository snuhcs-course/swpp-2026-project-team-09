/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { readCardAddress } from '@/push/card-address';

// The address of a card on the main screen, the one its push carries.
export function cardAddress(kind: string, id: string): string {
  return `/main?card=${kind}:${id}`;
}

// Opens an address as a tapped push does. Anything but a card's address opens nothing.
export function openAddress(address: string): void {
  const card = readCardAddress(address);
  if (card === null) {
    return;
  }
  router.navigate({ pathname: '/main', params: { card: `${card.kind}:${card.id}` } });
}
