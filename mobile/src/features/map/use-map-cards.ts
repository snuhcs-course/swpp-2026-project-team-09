import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { toFriendViews } from '@/features/friends/adapter';
import { type CardView, toCards } from './adapter';

export const MAP_CARDS_KEY = ['map-cards'] as const;

// Everything on the map that a press opens, each with its card: Global Events, the User's Parties, Friends and the
// members of the User's Party.
export function useMapCards(): UseQueryResult<CardView[]> {
  return useQuery({
    queryKey: MAP_CARDS_KEY,
    queryFn: async () => {
      const [globalEvents, globalEventAnnouncers, quests, parties, myParty, friends, positions, statuses] =
        await Promise.all([
          apiClient.listGlobalEvents(),
          apiClient.listGlobalEventAnnouncers(),
          apiClient.listQuests(),
          apiClient.listParties(),
          apiClient.getMyParty(),
          apiClient.listFriends(),
          apiClient.listPositions(),
          apiClient.listFriendStatuses(),
        ]);
      return toCards({
        globalEvents,
        globalEventAnnouncers,
        quests,
        parties,
        myParty,
        friends: toFriendViews(friends, positions, statuses),
        positions,
        meId: myUserId(),
        now: now(),
      });
    },
  });
}
