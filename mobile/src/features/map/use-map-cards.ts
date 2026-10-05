import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import {
  friendStatusesQuery,
  friendsQuery,
  globalEventAnnouncersQuery,
  globalEventsQuery,
  myPartyQuery,
  partiesQuery,
  positionsQuery,
  questsQuery,
} from '@/api/queries';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { Friend, FriendStatus, GlobalEvent, MyParty, Party, Position, Quest } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { toFriendViews } from '@/features/friends/adapter';
import { type CardView, toCards } from './adapter';

type Results = [
  UseQueryResult<GlobalEvent[]>,
  UseQueryResult<{ eventId: string; announcer: string }[]>,
  UseQueryResult<Quest[]>,
  UseQueryResult<Party[]>,
  UseQueryResult<MyParty | null>,
  UseQueryResult<Friend[]>,
  UseQueryResult<Position[]>,
  UseQueryResult<FriendStatus[]>,
];

// A failed operation takes away only the cards that cannot be right without it, and the others stay:
// - a Party's card is worded by the Quest, the User's Party and the listed Parties, so it needs all three;
// - a Friend's card needs the Friends and the positions;
// - a card of a member of the User's Party also needs the Friends, to know that the member is not one.
// A Global Event's card without the Parties only lacks its line of Parties.
function cardsOf(results: Results): CardView[] {
  const [globalEvents, announcers, quests, parties, myParty, friends, positions, statuses] = results;
  const cards = toCards({
    globalEvents: globalEvents.data ?? [],
    globalEventAnnouncers: announcers.data ?? [],
    quests: someFailed([myParty, parties]) ? [] : (quests.data ?? []),
    parties: parties.data ?? [],
    myParty: myParty.data ?? null,
    friends: toFriendViews(friends.data ?? [], positions.data ?? [], statuses.data ?? []),
    positions: positions.data ?? [],
    meId: myUserId(),
    now: now(),
  });
  return friends.isError ? cards.filter(({ kind }) => kind !== 'party-member') : cards;
}

// The announcers and the statuses are the app's own and never fail the map. Defined outside the hook, so that it runs
// again only when an answer changes.
function combine(results: Results): ScreenData<CardView[]> {
  const [globalEvents, , quests, parties, myParty, friends, positions] = results;
  const isPending = somePending(results);
  return {
    data: isPending ? undefined : cardsOf(results),
    isPending,
    isError: someFailed([globalEvents, quests, parties, myParty, friends, positions]),
    refetch: askAgain(results),
  };
}

// Everything on the map that a press opens, each with its card: Global Events, the User's Parties, Friends and the
// members of the User's Party. After a failure `data` holds the cards that are still right and `isError` is true.
export function useMapCards(): ScreenData<CardView[]> {
  return useQueries({
    queries: [
      globalEventsQuery,
      globalEventAnnouncersQuery,
      questsQuery,
      partiesQuery,
      myPartyQuery,
      friendsQuery,
      positionsQuery,
      friendStatusesQuery,
    ],
    combine,
  });
}
