/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useCallback, useState } from 'react';
import type { Tutorial, TutorialCompletedBy, TutorialQuest } from '@/api/tutorial-types';
import { checkKwanjeong, type KwanjeongCheck, type ShownBooking } from '@/features/tutorial/kwanjeong-check';
import { firstNotStarted, nextAfter } from '@/features/tutorial/rules';
import { type TutorialActions, useTutorial, useTutorialActions } from '@/features/tutorial/use-tutorial';
import { library } from '@/library/library';
import { useLibrarySession } from '@/library/library-session';

// The pager, "새내기 튜토리얼 n/N": a quest by its index, opened by the start button (`browse`) or after a quest was
// completed (`next`, "퀘스트 완료! 다음 퀘스트 · n/N"); or, once every quest is completed, "튜토리얼을 모두 마쳤어요".
export type PagerView = { kind: 'browse' | 'next'; index: number } | { kind: 'done' };

// A quest's sheet: its content (`info`), or its completionMessage in the Assistant's bubble with 퀘스트 완료
// (`message`). For the 관정 quest, the check between them: running (`checking`), no booking found (`notFound`) or the
// library not reached (`failed`); a booking found is `message` with the booking. `completed` once the main server
// holds the completion, as after the 관정 quest's skip; `completeAs` is how 퀘스트 완료 completes it otherwise.
export interface SheetView {
  key: string;
  mode: 'info' | 'checking' | 'notFound' | 'failed' | 'message';
  completed: boolean;
  completeAs: TutorialCompletedBy;
  booking: ShownBooking | null;
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
  // 완료했어요 and 다시 확인 of the 관정 quest: the check of the library's bookings.
  check: () => void;
  // The 관정 quest's "이미 예약 및 이용해본 적이 있어요": completed at once, then its completionMessage.
  skip: () => void;
  // 퀘스트 완료: completes the quest unless it is, closes the sheet and opens the pager on the next quest.
  finish: () => void;
  // 그냥 완료하기 after a check that found nothing: completed `forced`, then as 퀘스트 완료.
  forceDone: () => void;
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

type SheetActions = Pick<TutorialFlow, 'saidDone' | 'check' | 'skip' | 'finish' | 'forceDone'>;
type SetSheet = (change: (sheet: SheetView | null) => SheetView | null) => void;

// The sheet a check ends on, while the sheet still shows that check.
function afterCheck(sheet: SheetView | null, key: string, result: KwanjeongCheck): SheetView | null {
  if (sheet?.key !== key || sheet.mode !== 'checking') {
    return sheet;
  }
  if (result.kind === 'found') {
    return { ...sheet, mode: 'message', completeAs: 'checked', booking: result.booking };
  }
  return { ...sheet, mode: result.kind };
}

interface SheetDeps {
  sheet: SheetView | null;
  setSheet: SetSheet;
  setPager: SetPager;
  tutorial: Tutorial | undefined;
  complete: TutorialActions['complete'];
  runCheck: () => Promise<KwanjeongCheck>;
}

// What the sheet's buttons do once the User says the quest is done.
function sheetActions({ sheet, setSheet, setPager, tutorial, complete, runCheck }: SheetDeps): SheetActions {
  // Completes the quest unless it is, closes the sheet and opens the pager on the next quest.
  const moveOn = (by: TutorialCompletedBy): void => {
    if (sheet === null) {
      return;
    }
    const { key } = sheet;
    const completing = sheet.completed ? Promise.resolve(tutorial ?? null) : complete(key, by);
    void completing.then((after) => {
      if (after === null) {
        return;
      }
      setSheet(() => null);
      const next = after.state === 'finished' ? null : nextAfter(after.quests, key);
      setPager(next === null ? { kind: 'done' } : { kind: 'next', index: next });
    });
  };
  return {
    saidDone: () => {
      setSheet((shown) => (shown === null ? null : { ...shown, mode: 'message', completeAs: 'button' }));
    },
    check: () => {
      if (sheet === null || sheet.mode === 'checking') {
        return;
      }
      const { key } = sheet;
      setSheet((shown) => (shown?.key === key ? { ...shown, mode: 'checking', booking: null } : shown));
      void runCheck().then((result) => {
        setSheet((shown) => afterCheck(shown, key, result));
      });
    },
    skip: () => {
      if (sheet === null) {
        return;
      }
      void complete(sheet.key, 'skipped').then((after) => {
        if (after !== null) {
          setSheet(() => ({ ...sheet, mode: 'message', completed: true, booking: null }));
        }
      });
    },
    finish: () => {
      moveOn(sheet?.completeAs ?? 'button');
    },
    forceDone: () => {
      moveOn('forced');
    },
  };
}

export function useTutorialFlow(): TutorialFlow {
  const tutorial = useTutorial();
  const actions = useTutorialActions();
  const { pager, setPager, openPager, movePager, closePager } = usePager(tutorial?.quests);
  const [sheet, setSheet] = useState<SheetView | null>(null);
  const { logIn } = useLibrarySession();
  const openSheet = useCallback(
    (key: string) => {
      setPager(null);
      setSheet({ key, mode: 'info', completed: false, completeAs: 'button', booking: null });
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
    ...sheetActions({
      sheet,
      setSheet,
      setPager,
      tutorial,
      complete: actions.complete,
      runCheck: () => checkKwanjeong(library, logIn, new Date()),
    }),
  };
}
