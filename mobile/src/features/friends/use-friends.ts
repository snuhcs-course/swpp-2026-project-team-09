import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import { friendStatusesQuery, friendsQuery, positionsQuery } from '@/api/queries';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { Friend, FriendStatus, Position } from '@/api/types';
import { type FriendView, toFriendViews } from './adapter';

type Results = [UseQueryResult<Friend[]>, UseQueryResult<Position[]>, UseQueryResult<FriendStatus[]>];

// The statuses are the app's own and never fail the list: without them a Friend is shown by what the main server
// says. Defined outside the hook, so that it runs again only when an answer changes.
function combine(results: Results): ScreenData<FriendView[]> {
  const [friends, positions, statuses] = results;
  const isPending = somePending(results);
  const isError = someFailed([friends, positions]);
  const ready = !isPending && !isError;
  return {
    data: ready ? toFriendViews(friends.data ?? [], positions.data ?? [], statuses.data ?? []) : undefined,
    isPending,
    isError,
    refetch: askAgain(results),
  };
}

// The User's Friends, for the friend list and the Avatars on the map.
export function useFriends(): ScreenData<FriendView[]> {
  return useQueries({ queries: [friendsQuery, positionsQuery, friendStatusesQuery], combine });
}
