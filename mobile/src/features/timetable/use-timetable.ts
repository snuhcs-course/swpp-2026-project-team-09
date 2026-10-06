import { type UseQueryResult, useQueries, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '@/api/client';
import { CLASSES_KEY, classesQuery, placesQuery, QUESTS_KEY } from '@/api/queries';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { Place, TimetableClass } from '@/api/types';
import { type ClassDraft, saveOf } from './class-form';

export interface Timetable {
  classes: TimetableClass[];
  places: Place[];
}

type Results = [UseQueryResult<TimetableClass[]>, UseQueryResult<Place[]>];

function combine(results: Results): ScreenData<Timetable> {
  const [classes, places] = results;
  const isPending = somePending(results);
  const isError = someFailed(results);
  return {
    data: isPending || isError ? undefined : { classes: classes.data ?? [], places: places.data ?? [] },
    isPending,
    isError,
    refetch: askAgain(results),
  };
}

// The User's classes in the main server's order, and the Places they are held in.
export function useTimetable(): ScreenData<Timetable> {
  return useQueries({ queries: [classesQuery, placesQuery], combine });
}

interface ClassChanges {
  // Adds the class without `classId`, and replaces it with one. Gives the saved class, or throws the refusal.
  save: (classId: string | null, draft: ClassDraft) => Promise<TimetableClass>;
  remove: (classId: string) => Promise<void>;
}

// The changes to the timetable. After each, the classes and the Quests are fetched again, so that the timetable,
// 내 정보's week and today's Class Quests follow. The answer does not wait for them.
export function useClassChanges(): ClassChanges {
  const queryClient = useQueryClient();
  const changed = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: CLASSES_KEY });
    void queryClient.invalidateQueries({ queryKey: QUESTS_KEY });
  }, [queryClient]);
  const save = useCallback(
    async (classId: string | null, draft: ClassDraft): Promise<TimetableClass> => {
      const body = saveOf(draft);
      const saved = await (classId === null ? apiClient.addClass(body) : apiClient.replaceClass(classId, body));
      changed();
      return saved;
    },
    [changed],
  );
  const remove = useCallback(
    async (classId: string): Promise<void> => {
      await apiClient.deleteClass(classId);
      changed();
    },
    [changed],
  );
  return { save, remove };
}
