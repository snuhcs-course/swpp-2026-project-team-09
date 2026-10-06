import { queryOptions, type UseQueryOptions } from '@tanstack/react-query';
import { apiClient } from './client';
import type { RestaurantMenus } from './menu-types';
import type { RecruitingQuest } from './party-types';
import type { Board, Place, Quest } from './types';
import type { JoinRequest } from './waiting-types';

// One entry of the cache per operation, each under its own key. The hooks of the features combine them, so that an
// operation two screens need is asked once, and a change to one of them is one entry to ask again.

export const LOBBY_KEY = ['lobby'] as const;
export const FRIENDS_KEY = ['friends'] as const;
export const POSITIONS_KEY = ['positions'] as const;
export const FRIEND_STATUSES_KEY = ['friend-statuses'] as const;
export const QUESTS_KEY = ['quests'] as const;
export const MY_PARTY_KEY = ['my-party'] as const;
export const PARTIES_KEY = ['parties'] as const;
export const FRIEND_REQUESTS_KEY = ['friend-requests'] as const;
export const QUEST_INVITATIONS_KEY = ['quest-invitations'] as const;
export const JOIN_REQUESTS_KEY = ['join-requests'] as const;
export const SENT_INVITATIONS_KEY = ['sent-invitations'] as const;
export const DECLINED_PARTIES_KEY = ['declined-parties'] as const;
export const MEETUPS_KEY = ['meetups'] as const;
export const CLASSES_KEY = ['timetable-classes'] as const;
export const PLACES_KEY = ['places'] as const;
export const FOOTPRINTS_KEY = ['footprints'] as const;
export const GLOBAL_EVENTS_KEY = ['global-events'] as const;
export const GLOBAL_EVENT_ANNOUNCERS_KEY = ['global-event-announcers'] as const;
export const SHUTTLE_KEY = ['shuttle'] as const;
export const SHUTTLE_VEHICLES_KEY = ['shuttle-vehicles'] as const;
type MenusKey = readonly ['menus', string];
export const RECRUITING_KEY = ['recruiting'] as const;
export const MY_JOIN_REQUESTS_KEY = ['my-join-requests'] as const;

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
export const friendRequestsQuery = queryOptions({
  queryKey: FRIEND_REQUESTS_KEY,
  queryFn: () => apiClient.listFriendRequests(),
});
export const questInvitationsQuery = queryOptions({
  queryKey: QUEST_INVITATIONS_KEY,
  queryFn: () => apiClient.listQuestInvitations(),
});
// One entry for each Quest the User leads, all under one key, so that a signal fetches them all again.
export function joinRequestsQuery(questId: string): UseQueryOptions<JoinRequest[], Error, JoinRequest[], string[]> {
  return { queryKey: [...JOIN_REQUESTS_KEY, questId], queryFn: () => apiClient.listJoinRequests(questId) };
}
// One Quest, for its room. Under the key of the Quests, so that whatever fetches them again fetches it too.
export function questQuery(questId: string): UseQueryOptions<Quest, Error, Quest, string[]> {
  return { queryKey: [...QUESTS_KEY, questId], queryFn: () => apiClient.getQuest(questId) };
}
// The Leader's invitations into one Quest.
export function sentInvitationsQuery(questId: string): UseQueryOptions<JoinRequest[], Error, JoinRequest[], string[]> {
  return { queryKey: [...SENT_INVITATIONS_KEY, questId], queryFn: () => apiClient.listSentInvitations(questId) };
}
export const meetupsQuery = queryOptions({ queryKey: MEETUPS_KEY, queryFn: () => apiClient.listMeetups() });
export const classesQuery = queryOptions({ queryKey: CLASSES_KEY, queryFn: () => apiClient.listClasses() });
export const footprintsQuery = queryOptions({ queryKey: FOOTPRINTS_KEY, queryFn: () => apiClient.getFootprints() });
export const globalEventsQuery = queryOptions({
  queryKey: GLOBAL_EVENTS_KEY,
  queryFn: () => apiClient.listGlobalEvents(),
});
export const globalEventAnnouncersQuery = queryOptions({
  queryKey: GLOBAL_EVENT_ANNOUNCERS_KEY,
  queryFn: () => apiClient.listGlobalEventAnnouncers(),
});

// A day's menus and the Places change at most twice a day: an answer is kept while it is in use, and a day chosen
// again is not asked again.
export function menusQuery(date: string): UseQueryOptions<RestaurantMenus[], Error, RestaurantMenus[], MenusKey> {
  return { queryKey: ['menus', date], queryFn: () => apiClient.listMenus(date), staleTime: Infinity };
}
export const placesQuery = queryOptions({
  queryKey: PLACES_KEY,
  queryFn: () => apiClient.listPlaces(),
  staleTime: Infinity,
});
export function placeSearchQuery(words: string): UseQueryOptions<Place[], Error, Place[], string[]> {
  return { queryKey: [...PLACES_KEY, 'search', words], queryFn: () => apiClient.searchPlaces(words) };
}
// The shuttle's route and its vehicles, which the socket's `shuttle-vehicles-updated` replaces in the cache.
export const shuttleQuery = queryOptions({ queryKey: SHUTTLE_KEY, queryFn: () => apiClient.getShuttle() });
export const shuttleVehiclesQuery = queryOptions({
  queryKey: SHUTTLE_VEHICLES_KEY,
  queryFn: () => apiClient.listShuttleVehicles(),
});
// The recruiting Quests of one board, or of all under 'all', each under the one key.
export function recruitingQuery(
  board: Board | 'all',
): UseQueryOptions<RecruitingQuest[], Error, RecruitingQuest[], string[]> {
  return {
    queryKey: [...RECRUITING_KEY, board],
    queryFn: () => apiClient.listRecruitingQuests(board === 'all' ? undefined : board),
  };
}
export const myJoinRequestsQuery = queryOptions({
  queryKey: MY_JOIN_REQUESTS_KEY,
  queryFn: () => apiClient.listMyJoinRequests(),
});
