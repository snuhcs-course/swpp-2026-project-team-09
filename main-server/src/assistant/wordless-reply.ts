/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Presented } from './feature.js';

// What a reply says when no step of the model wrote any text: nothing beside a Lookup the map says all of, the fixed
// sentence over anything else it shows, and no reply at all when it shows nothing.

export const FIXED_SENTENCE = '아래에서 확인해 보세요.';

// A way says its Place, minutes and times on its flag and route, and a Place tapped is drawn where it is.
const SAID_BY_THE_MAP: ReadonlySet<string> = new Set(['way', 'place']);

export function wordlessText({ cards, mapButtons, proposal, answer, lookup, refusal }: Presented): string | null {
  const others = cards.length > 0 || mapButtons.length > 0 || proposal !== null || answer !== null;
  if (!others && lookup === null) {
    return null;
  }
  return !others && lookup !== null && refusal === null && SAID_BY_THE_MAP.has(lookup.kind) ? '' : FIXED_SENTENCE;
}
