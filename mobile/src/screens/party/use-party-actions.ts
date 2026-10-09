/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type QueryKey, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { apiClient } from '@/api/client';
import { MY_JOIN_REQUESTS_KEY, QUEST_INVITATIONS_KEY, QUESTS_KEY, RECRUITING_KEY } from '@/api/queries';
import type { QuestInvitation } from '@/api/waiting-types';
import { useToast } from '@/design-system';
import type { PostView } from '@/features/party/posts';
import { ENTERING, refusalWords } from '@/features/quests/refusals';

// What the 파티 tab asks of the main server to enter a Quest, each with its toast. A refusal says why in Korean, and
// the recruiting Quests, the User's Quests, requests and invitations are fetched again either way.

const PARTY_KEYS: readonly QueryKey[] = [RECRUITING_KEY, QUESTS_KEY, MY_JOIN_REQUESTS_KEY, QUEST_INVITATIONS_KEY];

export interface PartyActions {
  // Joins an Open Quest and shows 내 파티, or asks to join an Approval one.
  join: (post: PostView) => Promise<void>;
  withdraw: (requestId: string) => Promise<void>;
  accept: (invitation: QuestInvitation) => Promise<void>;
  decline: (invitation: QuestInvitation) => Promise<void>;
}

// The 파티 tab at 내 파티, closing the screens above it.
export function showMine(): void {
  if (router.canDismiss()) {
    router.dismissTo({ pathname: '/party', params: { tab: 'mine' } });
  } else {
    router.navigate({ pathname: '/party', params: { tab: 'mine' } });
  }
}

export function usePartyActions(): PartyActions {
  const queryClient = useQueryClient();
  const showToast = useToast();
  return useMemo(() => {
    const run = async (requests: () => Promise<unknown>, done: string | null): Promise<boolean> => {
      try {
        await requests();
        if (done !== null) {
          showToast(done);
        }
        return true;
      } catch (error) {
        showToast(refusalWords(error, ENTERING));
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
          await run(() => apiClient.askToJoinQuest(questId), '참여를 신청했어요');
        } else if (await run(() => apiClient.joinQuest(questId), `${title} 참여 완료`)) {
          showMine();
        }
      },
      withdraw: async (requestId) => {
        await run(() => apiClient.withdrawJoinRequest(requestId), null);
      },
      accept: async ({ id }) => {
        await run(() => apiClient.acceptInvitation(id), '파티에 참여했어요');
      },
      decline: async ({ id }) => {
        await run(() => apiClient.declineInvitation(id), null);
      },
    };
  }, [queryClient, showToast]);
}
