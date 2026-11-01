/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useCallback, useState } from 'react';
import type { Tutorial, TutorialQuest } from '@/api/tutorial-types';
import { firstNotStarted, nextAfter } from '@/features/tutorial/rules';
import { type TutorialActions, useTutorial, useTutorialActions } from '@/features/tutorial/use-tutorial';

// The pager, "새내기 튜토리얼 n/N": a quest by its index, opened by the start button (`browse`) or after a quest was
// completed (`next`, "퀘스트 완료! 다음 퀘스트 · n/N"); or, once every quest is completed, "튜토리얼을 모두 마쳤어요".
export type PagerView = { kind: 'browse' | 'next'; index: number } | { kind: 'done' };

// A quest's sheet: its content (`info`), or its completionMessage in the Assistant's bubble with 퀘스트 완료
// (`message`). `completed` once the main server holds the completion, as after the 관정 quest's skip.
export interface SheetView {
  key: string;
  mode: 'info' | 'message';
  completed: boolean;
}

export interface TutorialFlow {
  tutorial: Tutorial | undefined;
  actions: TutorialActions;
  pager: PagerView | null;
  sheet: SheetView | null;
  openPager: () => void;
  // ◀ is -1, ▶ is 1.
  movePager: (by: -1 | 1) => void;
  closePager: () => void;
  // 퀘스트 시작: the quest goes on top of the quest list, and the pager stays on it.
  startQuest: (key: string) => void;
  // 튜토리얼 그만하기.
  stop: () => void;
  openSheet: (key: string) => void;
  closeSheet: () => void;
  // 완료했어요 of a button quest: its completionMessage, before 퀘스트 완료 completes it.
  saidDone: () => void;
  // The 관정 quest's "이미 예약 및 이용해본 적이 있어요": completed at once, then its completionMessage.
  skip: () => void;
  // 퀘스트 완료: completes the quest unless it is, closes the sheet and opens the pager on the next quest.
  finish: () => void;
}

type SetPager = (pager: PagerView | null) => void;

function usePager(quests: readonly TutorialQuest[] | undefined): {
  pager: PagerView | null;
  setPager: SetPager;
} & Pick<TutorialFlow, 'openPager' | 'movePager' | 'closePager'> {
  const [pager, setPager] = useState<PagerView | null>(null);
  const openPager = useCallback(() => {
    setPager({ kind: 'browse', index: firstNotStarted(quests ?? []) });
  }, [quests]);
  const movePager = useCallback(
    (by: -1 | 1) => {
      setPager((shown) => {
        if (shown === null || shown.kind === 'done') {
          return shown;
        }
        const last = (quests?.length ?? 1) - 1;
        return { kind: 'browse', index: Math.min(last, Math.max(0, shown.index + by)) };
      });
    },
    [quests],
  );
  const closePager = useCallback(() => {
    setPager(null);
  }, []);
  return { pager, setPager, openPager, movePager, closePager };
}

type SheetActions = Pick<TutorialFlow, 'saidDone' | 'skip' | 'finish'>;

// What the sheet's buttons do once the User says the quest is done.
function sheetActions(
  sheet: SheetView | null,
  setSheet: (sheet: SheetView | null) => void,
  setPager: SetPager,
  tutorial: Tutorial | undefined,
  complete: TutorialActions['complete'],
): SheetActions {
  return {
    saidDone: () => {
      if (sheet !== null) {
        setSheet({ ...sheet, mode: 'message' });
      }
    },
    skip: () => {
      if (sheet === null) {
        return;
      }
      void complete(sheet.key, 'skipped').then((after) => {
        if (after !== null) {
          setSheet({ ...sheet, mode: 'message', completed: true });
        }
      });
    },
    finish: () => {
      if (sheet === null) {
        return;
      }
      const { key } = sheet;
      const completing = sheet.completed ? Promise.resolve(tutorial ?? null) : complete(key, 'button');
      void completing.then((after) => {
        if (after === null) {
          return;
        }
        setSheet(null);
        const next = after.state === 'finished' ? null : nextAfter(after.quests, key);
        setPager(next === null ? { kind: 'done' } : { kind: 'next', index: next });
      });
    },
  };
}

export function useTutorialFlow(): TutorialFlow {
  const tutorial = useTutorial();
  const actions = useTutorialActions();
  const { pager, setPager, openPager, movePager, closePager } = usePager(tutorial?.quests);
  const [sheet, setSheet] = useState<SheetView | null>(null);
  const openSheet = useCallback(
    (key: string) => {
      setPager(null);
      setSheet({ key, mode: 'info', completed: false });
    },
    [setPager],
  );
  const closeSheet = useCallback(() => {
    setSheet(null);
  }, []);
  return {
    tutorial,
    actions,
    pager,
    sheet,
    openPager,
    movePager,
    closePager,
    startQuest: (key) => {
      void actions.start(key);
    },
    stop: () => {
      void actions.stop().then((after) => {
        if (after !== null) {
          setPager(null);
          setSheet(null);
        }
      });
    },
    openSheet,
    closeSheet,
    ...sheetActions(sheet, setSheet, setPager, tutorial, actions.complete),
  };
}
