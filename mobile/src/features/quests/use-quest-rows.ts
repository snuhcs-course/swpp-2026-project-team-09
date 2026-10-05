import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { type QuestRowView, toQuestRows } from './adapter';

export const QUEST_ROWS_KEY = ['quest-rows'] as const;

// The rows of the Quest list: the User's Parties and today's classes, the earliest first.
export function useQuestRows(): UseQueryResult<QuestRowView[]> {
  return useQuery({
    queryKey: QUEST_ROWS_KEY,
    queryFn: async () => {
      const [quests, myParty, parties] = await Promise.all([
        apiClient.listQuests(),
        apiClient.getMyParty(),
        apiClient.listParties(),
      ]);
      return toQuestRows({ quests, myParty, parties, meId: myUserId(), now: now() });
    },
  });
}
