/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { queryOptions, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type { TaughtAlias } from '@/api/alias-types';
import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';

export const ALIASES_KEY = ['assistant-aliases'] as const;

export const aliasesQuery = queryOptions({ queryKey: ALIASES_KEY, queryFn: () => apiClient.listAliases() });

export interface TaughtAliases {
  list: UseQueryResult<TaughtAlias[]>;
  // Deletes the alias, which leaves the list at once, and fetches the list again, whether it was deleted or refused.
  // One deleted already, which the main server answers with 404, counts as deleted.
  remove: (aliasId: string) => Promise<void>;
}

// The words the User taught the Assistant, as 내가 가르친 말 lists them, and their deletion.
export function useTaughtAliases(): TaughtAliases {
  const queryClient = useQueryClient();
  const list = useQuery(aliasesQuery);
  const remove = async (aliasId: string): Promise<void> => {
    try {
      await apiClient.deleteAlias(aliasId);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        await queryClient.invalidateQueries({ queryKey: ALIASES_KEY });
        throw error;
      }
    }
    queryClient.setQueryData<TaughtAlias[]>(ALIASES_KEY, (held) => held?.filter(({ id }) => id !== aliasId));
    await queryClient.invalidateQueries({ queryKey: ALIASES_KEY });
  };
  return { list, remove };
}
