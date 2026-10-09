/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import { classesQuery, placesQuery } from '@/api/queries';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { Place, TimetableClass } from '@/api/types';
import { type ClassBlockView, toWeekBlocks } from './adapter';

type Results = [UseQueryResult<TimetableClass[]>, UseQueryResult<Place[]>];

// Defined outside the hook, so that it runs again only when an answer changes.
function combine(results: Results): ScreenData<ClassBlockView[]> {
  const [classes, places] = results;
  const isPending = somePending(results);
  const isError = someFailed(results);
  return {
    data: isPending || isError ? undefined : toWeekBlocks(classes.data ?? [], places.data ?? []),
    isPending,
    isError,
    refetch: askAgain(results),
  };
}

// The User's classes in the week on 내 정보, with the numbers of their Places.
export function useWeek(): ScreenData<ClassBlockView[]> {
  return useQueries({ queries: [classesQuery, placesQuery], combine });
}
