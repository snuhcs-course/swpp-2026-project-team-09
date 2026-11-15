/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import type { WatchedInterest } from '@/api/interest-types';
import { INTERESTS_KEY } from '@/api/queries';

export interface InterestChanges {
  watch: (words: string) => Promise<WatchedInterest>;
  // An interest removed already, here or on another phone, counts as removed.
  remove: (interestId: string) => Promise<void>;
}

// What the User changes of the watched interests. Each change, done or refused, fetches the list again.
export function useInterestChanges(): InterestChanges {
  const queryClient = useQueryClient();
  const settle = (): Promise<void> => queryClient.invalidateQueries({ queryKey: INTERESTS_KEY });
  return {
    watch: async (words) => {
      try {
        return await apiClient.watchInterest(words);
      } finally {
        await settle();
      }
    },
    remove: async (interestId) => {
      try {
        await apiClient.removeInterest(interestId);
      } catch (error) {
        if (!isRefusal(error, 404, 'INTEREST_NOT_FOUND')) {
          throw error;
        }
      } finally {
        await settle();
      }
    },
  };
}
