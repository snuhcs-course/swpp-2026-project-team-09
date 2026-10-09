/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  friendStatusesQuery,
  friendsQuery,
  globalEventAnnouncersQuery,
  globalEventsQuery,
  myPartyQuery,
  partiesQuery,
  positionsQuery,
  questsQuery,
  recruitingQuestsQuery,
} from '@/api/queries';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { RecruitingQuest } from '@/api/party-types';
import type { Friend, FriendStatus, GlobalEvent, MyParty, Party, Position, Quest } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { toFriendViews } from '@/features/friends/adapter';
import { useNow } from '@/hooks/use-now';
import { POSITION_AGE_EVERY_MS } from '@/position';
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
  UseQueryResult<RecruitingQuest[]>,
];

// A failed operation takes away only the cards that cannot be right without it, and the others stay:
// - a Party's card is worded by the Quest, the User's Party and the listed Parties, so it needs all three;
// - a Friend's card needs the Friends and the positions;
// - a card of a member of the User's Party also needs the Friends, to know that the member is not one.
// A Global Event's card without the recruiting Quests only lacks its line of them.
function cardsOf(results: Results, at: Date): CardView[] {
  const [globalEvents, announcers, quests, parties, myParty, friends, positions, statuses, recruiting] = results;
  const cards = toCards({
    globalEvents: globalEvents.data ?? [],
    globalEventAnnouncers: announcers.data ?? [],
    recruiting: recruiting.data ?? [],
    quests: someFailed([myParty, parties]) ? [] : (quests.data ?? []),
    parties: parties.data ?? [],
    myParty: myParty.data ?? null,
    friends: toFriendViews(friends.data ?? [], positions.data ?? [], statuses.data ?? [], at),
    positions: positions.data ?? [],
    meId: myUserId(),
    now: at,
  });
  return friends.isError ? cards.filter(({ kind }) => kind !== 'party-member') : cards;
}

// The phone's clock may be read later than the last look: a position that arrives is aged against it at once.
function agedAt(at: number): Date {
  return new Date(Math.max(now().getTime(), at));
}

// The announcers and the statuses are the app's own, and the recruiting Quests only count, so none fails the map. It
// runs again when an answer changes and when `at` does, which ages the positions.
function combine(results: Results, at: number): ScreenData<CardView[]> {
  const [globalEvents, , quests, parties, myParty, friends, positions] = results;
  const isPending = somePending(results);
  return {
    data: isPending ? undefined : cardsOf(results, agedAt(at)),
    isPending,
    isError: someFailed([globalEvents, quests, parties, myParty, friends, positions]),
    refetch: askAgain(results),
  };
}

// Everything on the map that a press opens, each with its card: Global Events, the User's Parties, Friends and the
// members of the User's Party. After a failure `data` holds the cards that are still right and `isError` is true. The
// age of the people's positions is looked at again every 15 seconds: an Avatar dims at two minutes and goes at ten.
export function useMapCards(): ScreenData<CardView[]> {
  const at = useNow(POSITION_AGE_EVERY_MS);
  const combineAt = useCallback((results: Results) => combine(results, at), [at]);
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
      recruitingQuestsQuery,
    ],
    combine: combineAt,
  });
}
