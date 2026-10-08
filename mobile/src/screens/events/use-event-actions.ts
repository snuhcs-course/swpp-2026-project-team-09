import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import {
  GLOBAL_EVENTS_KEY,
  MATCHING_REQUESTS_KEY,
  MY_JOIN_REQUESTS_KEY,
  QUESTS_KEY,
  RECRUITING_KEY,
} from '@/api/queries';
import { useToast } from '@/design-system';
import type { RecruitRowView } from '@/features/events/adapter';
import { ENTERING, refusalWords } from '@/features/quests/refusals';

const MATCH_SERVER_DOWN = '매칭 서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요';

export interface EventActions {
  requestMatching: (globalEventId: string, size: number) => Promise<void>;
  // True once the request is withdrawn.
  withdrawMatching: (globalEventId: string) => Promise<boolean>;
  // Joins an Open Quest, and opens its room, or asks to join an Approval one.
  join: (row: RecruitRowView) => Promise<void>;
}

interface Tools {
  refetch: (keys: readonly QueryKey[]) => void;
  showToast: (message: string) => void;
}

async function requestMatching({ refetch, showToast }: Tools, globalEventId: string, size: number): Promise<void> {
  try {
    await apiClient.requestMatching(globalEventId, size);
    showToast('매칭을 신청했어요 · 결과는 알림으로 와요');
  } catch (error) {
    // The match server's failure comes without a code, which tells it apart from a refusal.
    const down = error instanceof ApiError && error.status === 502 && error.code === null;
    showToast(down ? MATCH_SERVER_DOWN : refusalWords(error));
    if (error instanceof ApiError && error.code === 'GLOBAL_EVENT_NOT_FOUND') {
      refetch([GLOBAL_EVENTS_KEY]);
    }
  }
  refetch([MATCHING_REQUESTS_KEY]);
}

async function withdrawMatching({ refetch, showToast }: Tools, globalEventId: string): Promise<boolean> {
  try {
    await apiClient.withdrawMatchingRequest(globalEventId);
    showToast('매칭 신청을 취소했어요');
    return true;
  } catch (error) {
    showToast(refusalWords(error));
    return false;
  } finally {
    refetch([MATCHING_REQUESTS_KEY]);
  }
}

async function join({ refetch, showToast }: Tools, row: RecruitRowView): Promise<void> {
  try {
    if (row.joinPolicy === 'open') {
      await apiClient.joinQuest(row.questId);
      showToast(`${row.title} 참여 완료`);
      router.push(`/room/${row.questId}`);
    } else {
      await apiClient.askToJoinQuest(row.questId);
      showToast('참여를 신청했어요');
    }
  } catch (error) {
    showToast(refusalWords(error, ENTERING));
  }
  refetch([RECRUITING_KEY, QUESTS_KEY, MY_JOIN_REQUESTS_KEY]);
}

function toolsOf(queryClient: QueryClient, showToast: (message: string) => void): Tools {
  return {
    refetch: (keys) => {
      for (const queryKey of keys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    showToast,
  };
}

// What the 행사 tab asks of the main server, each with its toast. A refusal says why in Korean, and the lists it
// concerns are fetched again.
export function useEventActions(): EventActions {
  const queryClient = useQueryClient();
  const showToast = useToast();
  return useMemo(() => {
    const tools = toolsOf(queryClient, showToast);
    return {
      requestMatching: (globalEventId, size) => requestMatching(tools, globalEventId, size),
      withdrawMatching: (globalEventId) => withdrawMatching(tools, globalEventId),
      join: (row) => join(tools, row),
    };
  }, [queryClient, showToast]);
}
