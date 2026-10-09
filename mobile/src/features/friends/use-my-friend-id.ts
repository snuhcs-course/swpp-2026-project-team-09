/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { lobbyQuery } from '@/api/queries';

// The User's own Friend ID, from the Lobby. Undefined until the Lobby is there.
export function useMyFriendId(): string | undefined {
  return useQuery({ ...lobbyQuery, select: (lobby) => lobby.profile.friendId }).data;
}
