/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type UseQueryResult, useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { isWaitingCopy } from '@/api/kept-notifications-client';
import {
  NOTIFICATIONS_KEY,
  friendRequestsQuery,
  joinRequestsQuery,
  notificationsQuery,
  partiesQuery,
  questInvitationsQuery,
  questsQuery,
} from '@/api/queries';
import { type ScreenData, askAgain, somePending } from '@/api/screen-data';
import type { JoinRequest } from '@/api/waiting-types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { keptKey, type NoticeView, takesJoinRequests, toNotices, unreadKept, waitingNotices } from './adapter';

function answerOf<Answer>(result: UseQueryResult<Answer>): Answer | null {
  return result.data ?? null;
}

// The rows of 알림, composed from the lists the main server serves. A list that failed is left out; only when every
// list failed has 알림 failed.
export function useNotices(): ScreenData<NoticeView[]> {
  const lists = useQueries({
    queries: [partiesQuery, friendRequestsQuery, questInvitationsQuery, questsQuery, notificationsQuery],
  });
  const [parties, friendRequests, invitations, quests, kept] = lists;
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
            joinRequests:
              quests.data === undefined
                ? null
                : leading.flatMap((quest, index) => {
                    const answered: JoinRequest[] | undefined = requests[index]?.data;
                    return answered === undefined ? [] : [{ quest, requests: answered }];
                  }),
            kept: answerOf(kept),
            now: now(),
          }),
    isPending,
    isError,
    refetch: askAgain(asked),
  };
}

// The number on 오늘 (A04 ticket 12; once 내 정보's bell): the rows of 알림 that wait for the User, the rows of 답할 것,
// and the kept Notifications they have not read. Nothing while the lists load or when every one failed.
export function useBellCount(): number {
  const notices = useNotices().data;
  const kept = useQuery(notificationsQuery).data ?? [];
  return notices === undefined ? 0 : waitingNotices(notices).length + unreadKept(kept, now()).length;
}

// Marks read, on the main server, the kept Notifications 알림 shows once they are shown: again for each new unread one
// among them, as when one comes by the signal `notice` while 알림 is open. A failure leaves them unread, to be counted.
// Answers the keys of the rows that were unread when shown, which 알림 marks new while it is open, though they are read
// by then.
export function useMarkShownRead(shown: boolean): ReadonlySet<string> {
  const queryClient = useQueryClient();
  const kept = useQuery(notificationsQuery).data ?? [];
  const [shownUnread, setShownUnread] = useState<ReadonlySet<string>>(new Set());
  // The unread rows not yet asked for: a refetch of the same ones asks nothing.
  const fresh = (shown ? unreadKept(kept, now()) : [])
    .map(({ id }) => keptKey(id))
    .filter((key) => !shownUnread.has(key))
    .join(' ');
  const { mutate } = useMutation({
    mutationFn: () => apiClient.markNotificationsRead(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
  useEffect(() => {
    if (fresh !== '') {
      setShownUnread((before) => new Set([...before, ...fresh.split(' ')]));
      mutate();
    }
  }, [fresh, mutate]);
  return shownUnread;
}

// Deletes a kept Notification by its identity. Its row, and its count on the bell, go at once, before the main server
// answers; the list is fetched again after, so that one the main server kept comes back.
export function useDeleteNotice(): (keptId: string) => void {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: (keptId: string) => apiClient.deleteNotification(keptId),
    onMutate: async (keptId) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.setQueryData(notificationsQuery.queryKey, (kept) => kept?.filter(({ id }) => id !== keptId));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
  return mutate;
}

// 모두 지우기: deletes the kept Notifications whose time has come, but the pushes' copies of what waits. Their rows go at
// once, as a swipe's does, and the list is fetched again after.
export function useDeleteAllNotices(): () => void {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: () => apiClient.deleteNotifications(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const until = now().getTime();
      queryClient.setQueryData(notificationsQuery.queryKey, (kept) =>
        kept?.filter((notification) => isWaitingCopy(notification) || Date.parse(notification.at) > until),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
  return () => {
    mutate();
  };
}
