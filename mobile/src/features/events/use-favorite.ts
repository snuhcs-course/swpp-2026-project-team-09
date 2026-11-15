/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '@/api/client';
import { GLOBAL_EVENTS_KEY, globalEventsQuery } from '@/api/queries';
import type { ListedGlobalEvent } from '@/api/types';
import { useToast } from '@/design-system';
import { useCheckEvent } from './checked-events';

export const FAVORITE_NOT_CHANGED = '즐겨찾기를 바꾸지 못했어요';

export interface Favorite {
  // The User starred the event. An event the User's list does not hold is not starred.
  on: boolean;
  // Shows the new state at once, and the old one again with a toast when the main server did not take it; the list is
  // then fetched again, so that quick taps of which one failed end as the main server holds them. Starring a New Event
  // checks it once the main server took the star, so that a star that turns back leaves the event as it was.
  turn: (on: boolean) => void;
}

// Whether the User starred a Global Event, as the User's list of Global Events holds it, so that the 행사 tab, the
// chat and the map show one answer. The list is the only copy: a change shows wherever the event is.
export function useFavorite(eventId: string): Favorite {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const check = useCheckEvent();
  const on = useQuery({
    ...globalEventsQuery,
    select: (events: ListedGlobalEvent[]) => events.some(({ id, favorite }) => id === eventId && favorite),
  }).data;
  const turn = useCallback(
    (next: boolean) => {
      const show = (value: boolean): void => {
        queryClient.setQueryData<ListedGlobalEvent[]>(GLOBAL_EVENTS_KEY, (events) =>
          events?.map((event) => (event.id === eventId ? { ...event, favorite: value } : event)),
        );
      };
      // A fetch on its way holds the list from before the change.
      void queryClient.cancelQueries({ queryKey: GLOBAL_EVENTS_KEY });
      show(next);
      apiClient
        .setFavoriteEvent(eventId, next)
        .then(() => {
          if (next) {
            check(eventId);
          }
        })
        .catch(() => {
          show(!next);
          showToast(FAVORITE_NOT_CHANGED);
          void queryClient.invalidateQueries({ queryKey: GLOBAL_EVENTS_KEY });
        });
    },
    [check, eventId, queryClient, showToast],
  );
  return { on: on === true, turn };
}
