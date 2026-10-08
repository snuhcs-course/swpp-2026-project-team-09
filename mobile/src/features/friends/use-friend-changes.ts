import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { FRIEND_REQUESTS_KEY, FRIENDS_KEY, POSITIONS_KEY } from '@/api/queries';
import type { InviteLink, SentFriendRequest, UserSummary } from '@/api/types';

export interface FriendChanges {
  setSharing: (userId: string, on: boolean) => Promise<void>;
  endFriendship: (userId: string) => Promise<void>;
  findFriendId: (friendId: string) => Promise<UserSummary>;
  sendFriendRequest: (friendId: string) => Promise<SentFriendRequest>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
  createInviteLink: () => Promise<InviteLink>;
  acceptInviteLink: (token: string) => Promise<void>;
}

const FRIENDS_SEEN = [FRIENDS_KEY, POSITIONS_KEY] as const;

// What a User changes of their friendships. Each change asks the main server and then, whether it was done or
// refused, fetches again what it may have changed: the Friends and the positions they make seen, or the Friend
// Requests. A refusal is thrown as an `ApiError` for the screen to word.
export function useFriendChanges(): FriendChanges {
  const queryClient = useQueryClient();
  function changing<Args extends unknown[], Answer>(
    change: (...args: Args) => Promise<Answer>,
    keys: readonly QueryKey[],
  ): (...args: Args) => Promise<Answer> {
    return async (...args) => {
      try {
        return await change(...args);
      } finally {
        await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      }
    };
  }
  return {
    setSharing: changing(apiClient.setFriendSharing, FRIENDS_SEEN),
    endFriendship: changing(apiClient.endFriendship, FRIENDS_SEEN),
    findFriendId: apiClient.findFriendId,
    sendFriendRequest: changing(apiClient.sendFriendRequest, [...FRIENDS_SEEN, FRIEND_REQUESTS_KEY]),
    acceptFriendRequest: changing(apiClient.acceptFriendRequest, [...FRIENDS_SEEN, FRIEND_REQUESTS_KEY]),
    declineFriendRequest: changing(apiClient.declineFriendRequest, [FRIEND_REQUESTS_KEY]),
    cancelFriendRequest: changing(apiClient.cancelFriendRequest, [FRIEND_REQUESTS_KEY]),
    createInviteLink: apiClient.createInviteLink,
    acceptInviteLink: changing(apiClient.acceptInviteLink, [...FRIENDS_SEEN, FRIEND_REQUESTS_KEY]),
  };
}
