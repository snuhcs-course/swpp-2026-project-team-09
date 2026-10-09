/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import { useCallback } from 'react';
import { friendStatusesQuery, friendsQuery, positionsQuery } from '@/api/queries';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { Friend, FriendStatus, Position } from '@/api/types';
import { useNow } from '@/hooks/use-now';
import { POSITION_AGE_EVERY_MS } from '@/position';
import { type FriendView, toFriendViews } from './adapter';

type Results = [UseQueryResult<Friend[]>, UseQueryResult<Position[]>, UseQueryResult<FriendStatus[]>];

// The statuses are the app's own and never fail the list: without them a Friend is shown by what the main server
// says.
function combine(results: Results, at: number): ScreenData<FriendView[]> {
  const [friends, positions, statuses] = results;
  const isPending = somePending(results);
  const isError = someFailed([friends, positions]);
  const ready = !isPending && !isError;
  return {
    data: ready
      ? toFriendViews(friends.data ?? [], positions.data ?? [], statuses.data ?? [], new Date(at))
      : undefined,
    isPending,
    isError,
    refetch: askAgain(results),
  };
}

// The User's Friends, for the friend list and the Avatars on the map. The age of their positions is looked at again
// every 15 seconds.
export function useFriends(): ScreenData<FriendView[]> {
  const at = useNow(POSITION_AGE_EVERY_MS);
  const combineAt = useCallback((results: Results) => combine(results, at), [at]);
  return useQueries({ queries: [friendsQuery, positionsQuery, friendStatusesQuery], combine: combineAt });
}
