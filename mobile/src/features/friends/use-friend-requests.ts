// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { useQuery } from '@tanstack/react-query';
import { friendRequestsQuery } from '@/api/queries';
import type { ScreenData } from '@/api/screen-data';
import { type FriendRequestsView, toFriendRequestViews } from './adapter';

// The Friend Requests sent to the User and those the User sent, the newest first.
export function useFriendRequests(): ScreenData<FriendRequestsView> {
  const { data, isPending, isError, refetch } = useQuery({ ...friendRequestsQuery, select: toFriendRequestViews });
  return {
    data,
    isPending,
    isError,
    refetch: () => {
      void refetch();
    },
  };
}
