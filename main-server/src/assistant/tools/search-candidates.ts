/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { type FoundIds } from '../found-ids.js';

// What both search tools give the model and take from it: the most candidates, the characters of a description that
// tell what a candidate is, and the words that rank them.

export const CANDIDATES_MAX = 30;
export const DESCRIPTION_MAX = 150;

// Room for a word, its related words and a typo's correction, and for a broad word such as 운동 and its sports. Each word
// costs the query two ILIKEs, while a call over the limit is refused and costs the model a step.
const WORDS_MAX = 10;

export function wordsInput(candidates: string): z.ZodOptional<z.ZodArray<z.ZodString>> {
  return z
    .array(z.string().trim().min(1))
    .max(WORDS_MAX)
    .optional()
    .describe(
      `Words of what the User asked for, which rank the ${candidates}: those whose title or description holds more of them come first, and those holding none still fill the places left. Give the User's word and related words, such as 콘서트, 음악회, 연주회 and 뮤지컬 for 공연, and correct a typo in the User's question, as 영하제 to 영화제.`,
    );
}

// What a search says when resolvePlace answered a Place alone in this message and the search was not given it: that its
// candidates are from any place, and how to search near the Place. `given` is whether the search had a place.
export function placeNote(
  found: FoundIds,
  given: boolean,
  how: (named: string) => string,
): { note: string } | Record<string, never> {
  const places = found.resolvedPlaces();
  if (given || places.length === 0) {
    return {};
  }
  const named = places
    .map(({ id, name, number }) => `${name}${number === null ? '' : ` (${number}동)`}, placeId ${id}`)
    .join('; ');
  return { note: how(named) };
}
