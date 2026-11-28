/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { placeSearchQuery } from '@/api/queries';
import type { Place } from '@/api/types';

const SEARCH_AFTER_MS = 300;

// The words once they have not changed for a while.
function useSettled(words: string): string {
  const [settled, setSettled] = useState(words);
  useEffect(() => {
    const timer = setTimeout(setSettled, SEARCH_AFTER_MS, words);
    return (): void => {
      clearTimeout(timer);
    };
  }, [words]);
  return settled;
}

// The main server's search of the Places, asked once the User stopped typing: the words asked, '' while none are typed,
// and the answer, the previous one kept while the next is asked. The timetable's place picker and the 파티 form's place
// sheet both search with it.
export function usePlaceSearch(words: string): { asked: string; found: UseQueryResult<Place[]> } {
  const settled = useSettled(words.trim());
  const asked = words.trim() === '' ? '' : settled;
  const found = useQuery({ ...placeSearchQuery(asked), enabled: asked !== '', placeholderData: keepPreviousData });
  return { asked, found };
}
