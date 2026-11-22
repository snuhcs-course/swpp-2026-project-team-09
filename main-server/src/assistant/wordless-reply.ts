/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup } from './dto/answer.dto.js';
import { type Presented } from './feature.js';

// What a reply says when no step of the model wrote any text: nothing beside a Lookup, whose lines the app draws as
// the reply's words and sends back as what it said; the fixed sentence over anything else it shows, or a Lookup with no
// lines, so that no reply goes back empty; and no reply at all when it shows nothing.

export const FIXED_SENTENCE = '아래에서 확인해 보세요.';

const hasWords = ({ lines }: Lookup): boolean => lines.some((line) => line.some(({ text }) => text.trim() !== ''));

export function wordlessText({ cards, mapButtons, proposal, answer, lookup, refusal }: Presented): string | null {
  const others = cards.length > 0 || mapButtons.length > 0 || proposal !== null || answer !== null;
  if (!others && lookup === null) {
    return null;
  }
  return !others && lookup !== null && refusal === null && hasWords(lookup) ? '' : FIXED_SENTENCE;
}
