/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { apiClient } from '@/api/client';
import { TUTORIAL_KEY, tutorialQuery } from '@/api/queries';
import type { Tutorial, TutorialCompletedBy } from '@/api/tutorial-types';
import { useToast } from '@/design-system';

// The 새내기 튜토리얼 and what changes it. Each change's answer is the new tutorial, which replaces the cached one, so
// that the main screen and 내 정보 follow at once. A change that fails says so in a toast and resolves to null.

const NOT_SAVED = '지금은 바꿀 수 없어요. 잠시 후 다시 시도해 주세요';

export interface TutorialActions {
  // While a change is on its way: its buttons take no second press.
  working: boolean;
  enable: () => Promise<Tutorial | null>;
  stop: () => Promise<Tutorial | null>;
  hideRow: () => Promise<Tutorial | null>;
  start: (key: string) => Promise<Tutorial | null>;
  complete: (key: string, by: TutorialCompletedBy) => Promise<Tutorial | null>;
}

export function useTutorial(): Tutorial | undefined {
  return useQuery(tutorialQuery).data;
}

export function useTutorialActions(): TutorialActions {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [working, setWorking] = useState(false);
  const change = useCallback(
    async (send: () => Promise<Tutorial>): Promise<Tutorial | null> => {
      setWorking(true);
      try {
        const tutorial = await send();
        queryClient.setQueryData<Tutorial>(TUTORIAL_KEY, tutorial);
        return tutorial;
      } catch {
        showToast(NOT_SAVED);
        return null;
      } finally {
        setWorking(false);
      }
    },
    [queryClient, showToast],
  );
  return useMemo(
    () => ({
      working,
      enable: () => change(() => apiClient.enableTutorial()),
      stop: () => change(() => apiClient.stopTutorial()),
      hideRow: () => change(() => apiClient.hideTutorialRow()),
      start: (key) => change(() => apiClient.startTutorialQuest(key)),
      complete: (key, by) => change(() => apiClient.completeTutorialQuest(key, by)),
    }),
    [change, working],
  );
}
