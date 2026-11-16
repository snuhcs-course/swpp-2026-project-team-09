/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { FriendView } from './adapter';
import { type FriendProfile, profileOf } from './profile';
import { useFriends } from './use-friends';

// The Friend with this user id and what their profile adds to their card, or null for anyone who is not a Friend.
export function useFriendProfile(userId: string | null): { friend: FriendView; facts: FriendProfile } | null {
  const friend = useFriends().data?.find(({ id }) => id === userId);
  return friend === undefined ? null : { friend, facts: profileOf(friend) };
}
