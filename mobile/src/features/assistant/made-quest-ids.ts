/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { QUESTS_KEY } from '@/api/queries';
import { keep, readKept } from '@/storage/kept';

const MADE_QUESTS_KEY = ['made-quests'] as const;

// The Quests made from a Plan on this phone, by id. Nothing the main server sends marks such a Quest, so the phone
// keeps the id of each that POST /plans made; another phone of the User does not know it.
export const madeQuestIdsQuery = queryOptions({
  queryKey: MADE_QUESTS_KEY,
  queryFn: async (): Promise<string[]> => (await readKept()).madeQuests,
  staleTime: Infinity,
});

// Changes wait for each other, so that one does not write over another made at once.
let written: Promise<unknown> = Promise.resolve();

function rewrite(change: (ids: readonly string[]) => string[]): void {
  written = written
    .then(async () => {
      const { madeQuests } = await readKept();
      await keep({ madeQuests: change(madeQuests) });
    })
    .catch(() => null);
}

// Changes the ids on the phone and, once read, those the app holds.
function useChangeIds(): (change: (ids: readonly string[]) => string[]) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (change) => {
      queryClient.setQueryData<string[]>(MADE_QUESTS_KEY, (ids) => (ids === undefined ? undefined : change(ids)));
      rewrite(change);
    },
    [queryClient],
  );
}

// Keeps a Quest that POST /plans made, and reads the User's Quests again, so that a read begun before the Quest was
// made cannot come after and drop it.
export function useKeepMadeQuest(): (questId: string) => void {
  const queryClient = useQueryClient();
  const changeIds = useChangeIds();
  return useCallback(
    (questId) => {
      changeIds((ids) => (ids.includes(questId) ? [...ids] : [...ids, questId]));
      void queryClient.invalidateQueries({ queryKey: QUESTS_KEY, exact: true });
    },
    [queryClient, changeIds],
  );
}

export function useDropMadeQuests(): (gone: readonly string[]) => void {
  const changeIds = useChangeIds();
  return useCallback(
    (gone) => {
      changeIds((ids) => ids.filter((id) => !gone.includes(id)));
    },
    [changeIds],
  );
}
