/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { placesQuery } from '@/api/queries';
import type { Place } from '@/api/types';
import { matchesWords } from '@/features/search/matches-words';

// Whether a Place is found by the words: its name as every search of the app matches it (`matchesWords`, so a
// syllable still being typed and first consonants count), or its number, which a User writes as 302 or 302동.
export function matchesPlace(place: Place, words: string): boolean {
  const number = words.trim().replace(/동$/u, '');
  return matchesWords(words, [place.name]) || (place.number !== null && place.number === number);
}

// The search of the Places, on the phone over the list the app holds whole: the words asked, '' while none are
// typed, and the Places found. The timetable's place picker and the 파티 form's and the room's place sheet search
// with it.
export function usePlaceSearch(words: string): { asked: string; found: UseQueryResult<Place[]> } {
  const asked = words.trim();
  const found = useQuery({
    ...placesQuery,
    enabled: asked !== '',
    select: (places: Place[]) => places.filter((place) => matchesPlace(place, asked)),
  });
  return { asked, found };
}
