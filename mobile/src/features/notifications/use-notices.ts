/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type UseQueryResult, useQueries } from '@tanstack/react-query';
import {
  friendRequestsQuery,
  joinRequestsQuery,
  meetupsQuery,
  partiesQuery,
  questInvitationsQuery,
  questsQuery,
} from '@/api/queries';
import { type ScreenData, askAgain, somePending } from '@/api/screen-data';
import type { JoinRequest } from '@/api/waiting-types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { type NoticeView, takesJoinRequests, toNotices } from './adapter';

function answerOf<Answer>(result: UseQueryResult<Answer>): Answer | null {
  return result.data ?? null;
}

// The rows of 알림, composed from the lists the main server serves. A list that failed is left out; only when every
// list failed has 알림 failed.
export function useNotices(): ScreenData<NoticeView[]> {
  const lists = useQueries({
    queries: [partiesQuery, friendRequestsQuery, questInvitationsQuery, meetupsQuery, questsQuery],
  });
  const [parties, friendRequests, invitations, meetups, quests] = lists;
  const meId = myUserId();
  const leading = (quests.data ?? []).filter((quest) => takesJoinRequests(quest, meId));
  const requests = useQueries({ queries: leading.map((quest) => joinRequestsQuery(quest.id)) });
  const asked = [...lists, ...requests];
  const isPending = somePending(asked);
  const isError = lists.every((list) => list.isError);
  return {
    data:
      isPending || isError
        ? undefined
        : toNotices({
            parties: answerOf(parties),
            friendRequests: answerOf(friendRequests),
            invitations: answerOf(invitations),
            meetups: answerOf(meetups),
            joinRequests:
              quests.data === undefined
                ? null
                : leading.flatMap((quest, index) => {
                    const answered: JoinRequest[] | undefined = requests[index]?.data;
                    return answered === undefined ? [] : [{ quest, requests: answered }];
                  }),
            now: now(),
          }),
    isPending,
    isError,
    refetch: askAgain(asked),
  };
}

// The number on the bottom navigation's 파티: the rows of 알림 that concern 파티. It never fails a screen: while the
// lists load, and when every one failed, there is no badge.
export function usePartyBadge(): number {
  return (useNotices().data ?? []).filter(({ kind }) => kind !== 'friend-request').length;
}
