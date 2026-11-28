/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import { readCardAddress, roomAddress } from '@/push/card-address';

// The address of a card on the main screen, the one its push carries.
export function cardAddress(kind: string, id: string): string {
  return `/main?card=${kind}:${id}`;
}

// What a row or a push of a 파티 gone says when pressed, and a room whose 파티 is gone when it opens.
export const PARTY_GONE = '이미 없는 파티예요';

// Opens an address as a tapped push does. Anything but a card's address opens nothing. A 파티's own news,
// `room:<questId>`, opens its room over 알림, so that 뒤로 comes back to it.
export function openAddress(address: string): void {
  const card = readCardAddress(address);
  if (card === null) {
    return;
  }
  if (card.kind === 'room') {
    router.push(roomAddress(card.id));
    return;
  }
  router.navigate({ pathname: '/main', params: { card: `${card.kind}:${card.id}` } });
}
