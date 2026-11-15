/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { GLOBAL_EVENTS_KEY } from '@/api/queries';
import type { ListedGlobalEvent } from '@/api/types';
import { now } from '@/clock';
import { NEW_FOR_MS, publishedLately } from '@/features/map/event-pins';
import { type CheckedEvents, keepChecked, readCheckedEvents, stillNew } from '@/storage/checked-events';

// The New Events the User checked on this phone (`storage/checked-events.ts`), which the map no longer marks.

export const CHECKED_EVENTS_KEY = ['checked-events'] as const;

export const checkedEventsQuery = queryOptions({
  queryKey: CHECKED_EVENTS_KEY,
  // What cannot be read counts as none checked: the map then marks them again, which loses nothing.
  queryFn: () => readCheckedEvents(now(), NEW_FOR_MS).catch((): CheckedEvents => ({})),
  staleTime: Infinity,
});

// The ids among them.
export function checkedIds(checked: CheckedEvents | undefined): ReadonlySet<string> {
  return new Set(Object.keys(checked ?? {}));
}

// Checks the event, at once on the map and kept on the phone. An event that is no New Event, because it was published
// more than 24 hours ago or before the main server recorded it, needs nothing kept.
export function useCheckEvent(): (eventId: string) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (eventId: string) => {
      const at = now();
      const event = queryClient.getQueryData<ListedGlobalEvent[]>(GLOBAL_EVENTS_KEY)?.find(({ id }) => id === eventId);
      const publishedAt = event?.publishedAt ?? null;
      if (event === undefined || publishedAt === null || !publishedLately(event, at)) {
        return;
      }
      queryClient.setQueryData<CheckedEvents>(CHECKED_EVENTS_KEY, (checked = {}) =>
        stillNew({ ...checked, [eventId]: publishedAt }, at, NEW_FOR_MS),
      );
      // Read again once kept, so that a first read still on its way does not take the check back.
      void keepChecked(eventId, publishedAt, at, NEW_FOR_MS)
        .then(() => queryClient.invalidateQueries({ queryKey: CHECKED_EVENTS_KEY }))
        .catch(() => null);
    },
    [queryClient],
  );
}
