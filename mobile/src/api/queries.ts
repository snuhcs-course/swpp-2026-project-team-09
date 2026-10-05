import { queryOptions } from '@tanstack/react-query';
import { apiClient } from './client';

// One entry of the cache per operation, each under its own key. The hooks of the features combine them, so that an
// operation two screens need is asked once, and a change to one of them is one entry to ask again.

export const LOBBY_KEY = ['lobby'] as const;
export const FRIENDS_KEY = ['friends'] as const;
export const POSITIONS_KEY = ['positions'] as const;
export const FRIEND_STATUSES_KEY = ['friend-statuses'] as const;
export const QUESTS_KEY = ['quests'] as const;
export const MY_PARTY_KEY = ['my-party'] as const;
export const PARTIES_KEY = ['parties'] as const;
export const PARTY_NEWS_KEY = ['party-news'] as const;
export const FOOTPRINTS_KEY = ['footprints'] as const;
export const GLOBAL_EVENTS_KEY = ['global-events'] as const;
export const GLOBAL_EVENT_ANNOUNCERS_KEY = ['global-event-announcers'] as const;

// Ask it only for a User who finished Onboarding: the main server refuses it before.
// Entering the Lobby is done once, by the loading screen or after a sign-in, and its answer is not asked again by a
// screen that only reads it.
export const lobbyQuery = queryOptions({
  queryKey: LOBBY_KEY,
  queryFn: () => apiClient.enterLobby(),
  staleTime: Infinity,
});
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
export const partyNewsQuery = queryOptions({ queryKey: PARTY_NEWS_KEY, queryFn: () => apiClient.getPartyNews() });
export const footprintsQuery = queryOptions({ queryKey: FOOTPRINTS_KEY, queryFn: () => apiClient.getFootprints() });
export const globalEventsQuery = queryOptions({
  queryKey: GLOBAL_EVENTS_KEY,
  queryFn: () => apiClient.listGlobalEvents(),
});
export const globalEventAnnouncersQuery = queryOptions({
  queryKey: GLOBAL_EVENT_ANNOUNCERS_KEY,
  queryFn: () => apiClient.listGlobalEventAnnouncers(),
});
