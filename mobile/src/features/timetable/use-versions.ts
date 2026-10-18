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
  type MadeVersion,
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

function refusedWords(count: number): string {
  return `수업 ${count}개는 넣지 못했어요`;
}

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
  // For a version made elsewhere, such as from a screenshot. Resolves to what was left out once the switch finished,
  // for the caller's toast to say. Resolves to null when it did not finish, or when another change was on its way, and
  // then shows the toast that says so.
  make: (name: string, classes: ClassSave[]) => Promise<MadeVersion | null>;
}

type Run = (change: () => Promise<number>, switches?: boolean, sayBusy?: boolean) => Promise<boolean>;

// Runs one change at a time and says how it went. Resolves to whether it was done.
function useRun(): { busy: boolean; run: Run } {
  const queryClient = useQueryClient();
  const show = useToast();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    // `change` gives how many classes the main server refused for good, which the toast says. With `sayBusy`, a change
    // asked for while another is on its way says that it was not saved.
    async (change: () => Promise<number>, switches = true, sayBusy = false): Promise<boolean> => {
      if (running.current) {
        if (sayBusy) {
          show(NOT_SAVED, undefined, 'alert');
        }
        return false;
      }
      running.current = true;
      setBusy(true);
      let done = false;
      try {
        const refused = await change();
        done = true;
        if (refused > 0) {
          show(refusedWords(refused), undefined, 'alert');
        }
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
  return { busy, run };
}

// The versions for the week card. After a switch the classes and the Quests are fetched again, so that the timetable,
// the map, the Class Quests and the free time Friends see follow the version picked.
export function useTimetableVersions(): TimetableVersions {
  const { data } = useQuery(versionsQuery());
  const { busy, run } = useRun();

  return {
    view: data,
    busy,
    pick: useCallback((id: string) => void run(() => switchVersion(id)), [run]),
    rename: useCallback(
      (name: string) =>
        void run(async () => {
          await renameCurrentVersion(name);
          return 0;
        }, false),
      [run],
    ),
    remove: useCallback(() => void run(deleteCurrentVersion), [run]),
    addEmpty: useCallback(() => void run(addEmptyVersion), [run]),
    duplicate: useCallback(() => void run(duplicateCurrentVersion), [run]),
    retry: useCallback(() => void run(retrySwitch), [run]),
    make: useCallback(
      async (name: string, classes: ClassSave[]): Promise<MadeVersion | null> => {
        let made: MadeVersion | null = null;
        const done = await run(
          async () => {
            made = await makeVersion(name, classes);
            return 0;
          },
          true,
          true,
        );
        return done ? made : null;
      },
      [run],
    ),
  };
}
