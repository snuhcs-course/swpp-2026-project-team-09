// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import { isRefusal } from '@/api/errors';
import { friendsQuery, myPartyQuery, partiesQuery, questQuery } from '@/api/queries';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { Friend, MyParty, Party, Quest } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { declinedPartiesQuery } from '@/features/parties/declined';
import { type RoomView, toRoom } from './room-adapter';

export interface RoomData extends ScreenData<RoomView> {
  // The User no longer holds the Quest: removed, dropped on another phone or ended by its Leader.
  gone: boolean;
}

type Results = [
  UseQueryResult<Quest>,
  UseQueryResult<MyParty | null>,
  UseQueryResult<Party[]>,
  UseQueryResult<string[]>,
  UseQueryResult<Friend[]>,
];

// The Friends only tell whom the User sees, and never fail the room.
function combine(results: Results): RoomData {
  const [quest, myParty, parties, declined, friends] = results;
  const needed = [quest, myParty, parties, declined];
  const isPending = somePending(needed);
  const isError = someFailed(needed);
  return {
    data:
      quest.data === undefined || isPending || isError
        ? undefined
        : toRoom({
            quest: quest.data,
            myParty: myParty.data ?? null,
            parties: parties.data ?? [],
            declined: declined.data ?? [],
            seenFriends: (friends.data ?? []).filter(({ visible }) => visible).map(({ id }) => id),
            meId: myUserId(),
          }),
    isPending,
    isError,
    refetch: askAgain(needed),
    gone: isRefusal(quest.error, 404, 'QUEST_NOT_FOUND'),
  };
}

// A Quest's room: the Quest, its 활성화 and its members.
export function useRoom(questId: string): RoomData {
  return useQueries({
    queries: [questQuery(questId), myPartyQuery, partiesQuery, declinedPartiesQuery, friendsQuery],
    combine,
  });
}
