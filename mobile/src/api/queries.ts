import { queryOptions } from '@tanstack/react-query';
import { apiClient } from './client';

// One entry of the cache per operation, each under its own key. The hooks of the features combine them, so that an
// operation two screens need is asked once, and a change to one of them is one entry to ask again.

export const FRIENDS_KEY = ['friends'] as const;
export const POSITIONS_KEY = ['positions'] as const;
export const FRIEND_STATUSES_KEY = ['friend-statuses'] as const;
export const QUESTS_KEY = ['quests'] as const;
export const MY_PARTY_KEY = ['my-party'] as const;
export const PARTIES_KEY = ['parties'] as const;
export const GLOBAL_EVENTS_KEY = ['global-events'] as const;
export const GLOBAL_EVENT_ANNOUNCERS_KEY = ['global-event-announcers'] as const;

export const friendsQuery = queryOptions({ queryKey: FRIENDS_KEY, queryFn: () => apiClient.listFriends() });
export const positionsQuery = queryOptions({ queryKey: POSITIONS_KEY, queryFn: () => apiClient.listPositions() });
export const friendStatusesQuery = queryOptions({
  queryKey: FRIEND_STATUSES_KEY,
  queryFn: () => apiClient.listFriendStatuses(),
});
export const questsQuery = queryOptions({ queryKey: QUESTS_KEY, queryFn: () => apiClient.listQuests() });
// Null, for a User in no Party, is an answer as any other.
export const myPartyQuery = queryOptions({ queryKey: MY_PARTY_KEY, queryFn: () => apiClient.getMyParty() });
export const partiesQuery = queryOptions({ queryKey: PARTIES_KEY, queryFn: () => apiClient.listParties() });
export const globalEventsQuery = queryOptions({
  queryKey: GLOBAL_EVENTS_KEY,
  queryFn: () => apiClient.listGlobalEvents(),
});
export const globalEventAnnouncersQuery = queryOptions({
  queryKey: GLOBAL_EVENT_ANNOUNCERS_KEY,
  queryFn: () => apiClient.listGlobalEventAnnouncers(),
});
