/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CLASSES_KEY, QUESTS_KEY } from '@/api/queries';
import type { ClassSave } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { useToast } from '@/design-system';
import {
  addEmptyVersion,
  deleteCurrentVersion,
  duplicateCurrentVersion,
  makeVersion,
  readVersions,
  renameCurrentVersion,
  retrySwitch,
  switchVersion,
  type VersionsView,
  VersionsRefusal,
} from './versions';

// Every User's versions; one User's are under their id.
export const VERSIONS_KEY = ['timetable-versions'] as const;

const TOO_MANY = '시간표는 10개까지 저장할 수 있어요';
export const NOT_MOVED = '시간표를 다 옮기지 못했어요';
const NOT_SAVED = '저장하지 못했어요. 다시 시도해 주세요';

function versionsQuery(): { queryKey: readonly string[]; queryFn: () => Promise<VersionsView> } {
  return { queryKey: [...VERSIONS_KEY, myUserId()], queryFn: readVersions };
}

// The words for a change that failed: `시간표를 다 옮기지 못했어요` only when a switch stopped midway.
async function failureWords(error: unknown): Promise<string> {
  if (error instanceof VersionsRefusal) {
    return error.reason === 'too-many' ? TOO_MANY : NOT_MOVED;
  }
  try {
    return (await readVersions()).unfinished ? NOT_MOVED : NOT_SAVED;
  } catch {
    return NOT_SAVED;
  }
}

// At the app's start once signed in, whatever screen opens first: the first read of the versions finishes a switch
// that the app left unfinished when it closed. The classes and the Quests are then fetched again.
export function useVersionsAtLaunch(): void {
  const queryClient = useQueryClient();
  const { isSuccess } = useQuery(versionsQuery());
  useEffect(() => {
    if (isSuccess) {
      void queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
      void queryClient.invalidateQueries({ queryKey: QUESTS_KEY });
    }
  }, [isSuccess, queryClient]);
}

// Placed once in the signed-in layout.
export function VersionsAtLaunch(): null {
  useVersionsAtLaunch();
  return null;
}

export interface TimetableVersions {
  view: VersionsView | undefined;
  // A change is on its way; the others are ignored until it is done.
  busy: boolean;
  pick: (id: string) => void;
  rename: (name: string) => void;
  remove: () => void;
  addEmpty: () => void;
  duplicate: () => void;
  retry: () => void;
  // For a version made elsewhere, such as from a screenshot. Resolves to whether the switch finished.
  make: (name: string, classes: ClassSave[]) => Promise<boolean>;
}

// The versions for the week card. After a switch the classes and the Quests are fetched again, so that the timetable,
// the map, the Class Quests and the free time Friends see follow the version picked.
export function useTimetableVersions(): TimetableVersions {
  const queryClient = useQueryClient();
  const show = useToast();
  const { data } = useQuery(versionsQuery());
  const running = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (change: () => Promise<void>, switches = true): Promise<boolean> => {
      if (running.current) {
        return false;
      }
      running.current = true;
      setBusy(true);
      let done = false;
      try {
        await change();
        done = true;
      } catch (error) {
        show(await failureWords(error), undefined, 'alert');
      } finally {
        running.current = false;
        setBusy(false);
        await queryClient.invalidateQueries({ queryKey: VERSIONS_KEY });
        if (switches) {
          void queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
          void queryClient.invalidateQueries({ queryKey: QUESTS_KEY });
        }
      }
      return done;
    },
    [queryClient, show],
  );

  return {
    view: data,
    busy,
    pick: useCallback((id: string) => void run(() => switchVersion(id)), [run]),
    rename: useCallback((name: string) => void run(() => renameCurrentVersion(name), false), [run]),
    remove: useCallback(() => void run(deleteCurrentVersion), [run]),
    addEmpty: useCallback(() => void run(addEmptyVersion), [run]),
    duplicate: useCallback(() => void run(duplicateCurrentVersion), [run]),
    retry: useCallback(() => void run(retrySwitch), [run]),
    make: useCallback((name: string, classes: ClassSave[]) => run(() => makeVersion(name, classes)), [run]),
  };
}
