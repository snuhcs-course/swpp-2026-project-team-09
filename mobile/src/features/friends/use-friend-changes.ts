/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { FRIEND_REQUESTS_KEY, FRIENDS_KEY, POSITIONS_KEY } from '@/api/queries';
import type { AskedMoment, FriendLevel, InviteLink, SentFriendRequest, UserSummary } from '@/api/types';

export interface FriendChanges {
  setLevel: (userId: string, level: FriendLevel) => Promise<void>;
  // Every Friend above the level, lowered to it.
  lowerLevels: (level: FriendLevel) => Promise<void>;
  recordAsked: (userIds: string[], moment: AskedMoment) => Promise<void>;
  endFriendship: (userId: string) => Promise<void>;
  findFriendId: (friendId: string) => Promise<UserSummary>;
  sendFriendRequest: (friendId: string) => Promise<SentFriendRequest>;
  // From a 파티's member row.
  sendFriendRequestToUser: (userId: string) => Promise<SentFriendRequest>;
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
    setLevel: changing(apiClient.setFriendLevel, FRIENDS_SEEN),
    lowerLevels: changing(apiClient.lowerFriendLevels, FRIENDS_SEEN),
    recordAsked: changing(apiClient.recordFriendsAsked, [FRIENDS_KEY]),
    endFriendship: changing(apiClient.endFriendship, FRIENDS_SEEN),
    findFriendId: apiClient.findFriendId,
    sendFriendRequest: changing(apiClient.sendFriendRequest, [...FRIENDS_SEEN, FRIEND_REQUESTS_KEY]),
    sendFriendRequestToUser: changing(apiClient.sendFriendRequestToUser, [...FRIENDS_SEEN, FRIEND_REQUESTS_KEY]),
    acceptFriendRequest: changing(apiClient.acceptFriendRequest, [...FRIENDS_SEEN, FRIEND_REQUESTS_KEY]),
    declineFriendRequest: changing(apiClient.declineFriendRequest, [FRIEND_REQUESTS_KEY]),
    cancelFriendRequest: changing(apiClient.cancelFriendRequest, [FRIEND_REQUESTS_KEY]),
    createInviteLink: apiClient.createInviteLink,
    acceptInviteLink: changing(apiClient.acceptInviteLink, [...FRIENDS_SEEN, FRIEND_REQUESTS_KEY]),
  };
}
