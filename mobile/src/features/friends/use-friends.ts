import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { type FriendView, toFriendViews } from './adapter';

export const FRIENDS_KEY = ['friends'] as const;

// The User's Friends, for the friend list and the Avatars on the map.
export function useFriends(): UseQueryResult<FriendView[]> {
  return useQuery({
    queryKey: FRIENDS_KEY,
    queryFn: async () => {
      const [friends, positions, statuses] = await Promise.all([
        apiClient.listFriends(),
        apiClient.listPositions(),
        apiClient.listFriendStatuses(),
      ]);
      return toFriendViews(friends, positions, statuses);
    },
  });
}
