/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// A card on the main screen's map, such as a party's: `{ kind: 'party', id: <questId> }`.
export interface Card {
  kind: string;
  id: string;
}

// The grammar the app reads in `?card=`.
const KIND = /^[a-z-]+$/u;
const ID = /^[A-Za-z0-9.,-]+$/u;

// The address that opens the card: `/main?card=<kind>:<id>`.
export function cardAddress({ kind, id }: Card): string {
  if (!KIND.test(kind) || !ID.test(id)) {
    throw new Error(`No address opens the card ${kind}:${id}`);
  }
  return `/main?card=${kind}:${id}`;
}

// A 파티's own news, which the User wants to read in its room: its 일정, its members and its activation (P06 ticket 37).
const ROOM_KINDS: ReadonlySet<string> = new Set([
  'became-leader',
  'join-accepted',
  'step-changed',
  'arrived',
  'late',
  'accepted',
  'declined',
]);

// The address a kept Notification opens, in the list and in its push. A 파티's own news stays kept on the 파티's card,
// `party:<questId>`, so that a new one replaces an old one, but opens the room, `room:<questId>`; those kept before
// open it too. Every other kind opens its card.
export function openedAddress(kind: string, card: Card): string {
  return cardAddress(ROOM_KINDS.has(kind) && card.kind === 'party' ? { kind: 'room', id: card.id } : card);
}
