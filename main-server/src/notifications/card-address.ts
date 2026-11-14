/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
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
