/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
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

// The screen the row of 알림 opens, for a card the map does not hold. An event the map shows no card of, such as one on
// a later day, opens in the 행사 tab. A declined request to join (`find-parties:<questId>`) opens 찾기, for another 파티.
export function fallbackFor({ kind, id }: CardAddress): Href {
  if (kind === 'invitation') {
    return { pathname: '/party', params: { tab: 'invites' } };
  }
  if (kind === 'find-parties') {
    return { pathname: '/party', params: { tab: 'find' } };
  }
  if (kind === 'event') {
    return { pathname: '/events', params: { focus: id } };
  }
  return { pathname: '/main' };
}
