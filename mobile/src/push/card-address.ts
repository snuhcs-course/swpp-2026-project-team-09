/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { Href } from 'expo-router';

export interface CardAddress {
  kind: string;
  id: string;
}

const PREFIX = '/main?card=';
// A Place group's id is `place:<latitude>,<longitude>`, so an id may hold `.` and `,`.
const CARD = /^(?<kind>[a-z-]+):(?<id>[A-Za-z0-9.,-]+)$/u;

// The `card` parameter of `/main`, `<kind>:<id>`.
export function readCard(card: string): CardAddress | null {
  const groups = CARD.exec(card)?.groups;
  if (groups?.kind === undefined || groups.id === undefined) {
    return null;
  }
  return { kind: groups.kind, id: groups.id };
}

// A push's data carries one address, `/main?card=<kind>:<id>`. Anything else is refused.
export function readCardAddress(url: unknown): CardAddress | null {
  if (typeof url !== 'string' || !url.startsWith(PREFIX)) {
    return null;
  }
  return readCard(url.slice(PREFIX.length));
}

// The screen the row of 알림 opens, for a card the map does not hold.
export function fallbackFor(kind: string): Href {
  if (kind === 'invitation') {
    return { pathname: '/party', params: { tab: 'invites' } };
  }
  return { pathname: '/main' };
}
