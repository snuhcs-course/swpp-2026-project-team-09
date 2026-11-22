/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import {
  COMPANION_SEEKERS_KEY,
  HIDDEN_POSTS_KEY,
  MY_JOIN_REQUESTS_KEY,
  OFFICIAL_RECRUITING_KEY,
  QUEST_INVITATIONS_KEY,
  QUESTS_KEY,
  questsQuery,
  RECRUITING_KEY,
} from '@/api/queries';
import type { CompanionSeeker, OfficialRecruiting } from '@/api/quest-parts-types';
import type { MyJoinRequest, QuestInvitation } from '@/api/waiting-types';
import { type ToastAction, useToast } from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { ENTERING, refusalWords } from '@/features/quests/refusals';
import type { PartyTab } from './party-screen';

// What the 파티 tab asks of the main server to enter a Quest, each with its toast. A refusal says why in Korean, and
// the recruiting Quests, the User's Quests, requests and invitations are fetched again either way.

const PARTY_KEYS: readonly QueryKey[] = [RECRUITING_KEY, QUESTS_KEY, MY_JOIN_REQUESTS_KEY, QUEST_INVITATIONS_KEY];

export interface PartyActions {
  // Joins an Open Quest and shows 내 파티, or asks to join an Approval one.
  join: (post: PostView) => Promise<void>;
  // Withdraws the request to join the Quest `questId`, from 보낸 신청 or the post.
  withdraw: (requestId: string, questId: string) => Promise<void>;
  // Each gives whether the main server did it.
  accept: (invitation: QuestInvitation) => Promise<boolean>;
  decline: (invitation: QuestInvitation) => Promise<boolean>;
}

// The 파티 tab at one of its tabs, closing the screens above it.
function showPartyTab(tab: PartyTab): void {
  if (router.canDismiss()) {
    router.dismissTo({ pathname: '/party', params: { tab } });
  } else {
    router.navigate({ pathname: '/party', params: { tab } });
  }
}

export function showMine(): void {
  showPartyTab('mine');
}

export function showFind(): void {
  showPartyTab('find');
}

// 초대, where 보낸 신청 lists the requests to join.
export function showSentRequests(): void {
  showPartyTab('invites');
}

// The toast after asking to join links to where the request now shows (HE H11).
const TO_SENT_REQUESTS: ToastAction = { label: '보낸 신청 보기', onPress: showSentRequests };

// Accepting and declining both delete a request, so a withdrawal after either is refused with the same not-found, and
// only the User's Quests tell them apart: holding the Quest now means the Leader accepted. Null when the Quests do not
// come either, and for any other refusal.
function isGone(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'QUEST_JOIN_REQUEST_NOT_FOUND';
}

async function answeredFirstWords(queryClient: QueryClient, questId: string, error: unknown): Promise<string | null> {
  if (!isGone(error)) {
    return null;
  }
  try {
    const quests = await queryClient.query({ ...questsQuery, staleTime: 0 });
    return quests.some(({ id }) => id === questId) ? '이미 파티에 들어갔어요' : '파티장이 신청을 받지 않았어요';
  } catch {
    return null;
  }
}

// The request leaves 보낸 신청 at once once it is gone, so that a second 신청 취소 before the list comes again cannot
// find it gone and say the Leader declined.
function dropRequest(queryClient: QueryClient, requestId: string): void {
  queryClient.setQueryData<MyJoinRequest[]>(MY_JOIN_REQUESTS_KEY, (requests) =>
    requests?.filter(({ id }) => id !== requestId),
  );
}

// The requests being withdrawn, from 보낸 신청 or the post: a second press while one is on its way sends nothing.
const withdrawing = new Set<string>();

// Sends a request and toasts `done`, with `link` when given, or the words `refused` gives for a refusal; true when the
// main server did it.
type Run = (
  requests: () => Promise<unknown>,
  done: string | null,
  refused?: (error: unknown) => Promise<string | null>,
  link?: ToastAction,
) => Promise<boolean>;

async function withdrawOnce(run: Run, queryClient: QueryClient, requestId: string, questId: string): Promise<void> {
  if (withdrawing.has(requestId)) {
    return;
  }
  withdrawing.add(requestId);
  let gone = false;
  const withdrawn = await run(
    () => apiClient.withdrawJoinRequest(requestId),
    '신청을 취소했어요',
    (error) => {
      gone = isGone(error);
      return answeredFirstWords(queryClient, questId, error);
    },
  );
  withdrawing.delete(requestId);
  if (withdrawn || gone) {
    dropRequest(queryClient, requestId);
  }
}

export function usePartyActions(): PartyActions {
  const queryClient = useQueryClient();
  const showToast = useToast();
  return useMemo(() => {
    // `refused` may give words of its own for a refusal; otherwise the table's are shown.
    const run: Run = async (requests, done, refused, link) => {
      try {
        await requests();
        if (done !== null) {
          showToast(done, undefined, undefined, link);
        }
        return true;
      } catch (error) {
        showToast((await refused?.(error)) ?? refusalWords(error, ENTERING), undefined, 'alert');
        return false;
      } finally {
        for (const queryKey of PARTY_KEYS) {
          void queryClient.invalidateQueries({ queryKey });
        }
      }
    };
    return {
      join: async ({ questId, title, joinPolicy }) => {
        if (joinPolicy === 'approval') {
          await run(() => apiClient.askToJoinQuest(questId), '참여를 신청했어요', undefined, TO_SENT_REQUESTS);
        } else if (await run(() => apiClient.joinQuest(questId), `${title} 참여 완료`)) {
          showMine();
        }
      },
      withdraw: (requestId, questId) => withdrawOnce(run, queryClient, requestId, questId),
      accept: ({ id }) => run(() => apiClient.acceptInvitation(id), '파티에 참여했어요'),
      decline: ({ id }) => run(() => apiClient.declineInvitation(id), null),
    };
  }, [queryClient, showToast]);
}

export interface FindActions {
  // `관심 없음`: hides the post from 찾기. False when the phone could not keep it.
  hide: (questId: string) => Promise<boolean>;
  joinOfficial: (recruiting: OfficialRecruiting) => Promise<void>;
  askSeeker: (seeker: CompanionSeeker) => Promise<void>;
}

const NOT_KEPT = '저장하지 못했어요. 다시 시도해 주세요';

// What 찾기 does with its mocked parts. The phone keeps each, and nobody else sees it (P06 spec, Mocks).
export function useFindActions(): FindActions {
  const queryClient = useQueryClient();
  const showToast = useToast();
  return useMemo(() => {
    // Keeps it on the phone and fetches the list again; a failure to keep it says so.
    const keep = async (saving: () => Promise<void>, queryKey: QueryKey, done: string | null): Promise<boolean> => {
      try {
        await saving();
      } catch {
        showToast(NOT_KEPT, undefined, 'alert');
        return false;
      }
      await queryClient.invalidateQueries({ queryKey });
      if (done !== null) {
        showToast(done);
      }
      return true;
    };
    return {
      hide: (questId) => keep(() => apiClient.hidePost(questId), HIDDEN_POSTS_KEY, null),
      joinOfficial: async ({ id, title }) => {
        await keep(
          () => apiClient.joinOfficialRecruiting(id),
          OFFICIAL_RECRUITING_KEY,
          `${title.replaceAll('\n', ' ')} 참여 완료`,
        );
      },
      askSeeker: async ({ id, name }) => {
        await keep(() => apiClient.askCompanionSeeker(id), COMPANION_SEEKERS_KEY, `${name}님에게 같이 하자고 했어요`);
      },
    };
  }, [queryClient, showToast]);
}
