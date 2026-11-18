/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useCallback, useState } from 'react';
import type { Tutorial, TutorialCompletedBy } from '@/api/tutorial-types';
import { checkKwanjeong, type KwanjeongCheck, type ShownBooking } from '@/features/tutorial/kwanjeong-check';
import { firstCategory, nextAfter } from '@/features/tutorial/rules';
import { type TutorialActions, useTutorial, useTutorialActions } from '@/features/tutorial/use-tutorial';
import { library } from '@/library/library';
import { useLibrarySession } from '@/library/library-session';
import { type TutorialGuideFlow, useGuideFlow } from './use-guide-flow';

// The tutorial's list (MainTutorialPager): one Tutorial Category's quests, opened by the start button; after a quest
// was completed, on the next quest's category with the completed one's banner and the next one marked 다음
// (MainTutorialNext); or, once every quest is completed, "n / n" (MainTutorialDone).
export type ListView = ShownList | { kind: 'done' };

// The list on one category's quests.
export interface ShownList {
  kind: 'list';
  category: string;
  banner: string | null;
  next: string | null;
}

// A quest's sheet, for a quest without a guide (MainTutorialSheet): its content (`info`), or its completionMessage in
// the Assistant's bubble with 퀘스트 완료 (`message`). For the 관정 quest, the check between them: running
// (`checking`), no booking found (`notFound`) or the library not reached (`failed`); a booking found is `message` with
// the booking. `completed` once the main server holds the completion, as after the 관정 quest's skip; `completeAs` is
// how 퀘스트 완료 completes it otherwise.
export interface SheetView {
  key: string;
  mode: 'info' | 'checking' | 'notFound' | 'failed' | 'message';
  completed: boolean;
  completeAs: TutorialCompletedBy;
  booking: ShownBooking | null;
}

export interface TutorialFlow extends TutorialGuideFlow {
  tutorial: Tutorial | undefined;
  actions: TutorialActions;
  list: ListView | null;
  sheet: SheetView | null;
  // The start button: the list, on the category of the first quest not completed.
  openList: () => void;
  // A category's tab.
  showCategory: (category: string) => void;
  closeList: () => void;
  // A row of the list: the quest is started unless it is, and its guide opens, or its sheet without one.
  openQuest: (key: string) => void;
  // 튜토리얼 그만하기.
  stop: () => void;
  closeSheet: () => void;
  // ✓ 완료 of a button quest's sheet: its completionMessage, before 퀘스트 완료 completes it.
  saidDone: () => void;
  // ✓ 완료 and 다시 확인 of the 관정 quest: the check of the library's bookings.
  check: () => void;
  // The 관정 quest's "이미 예약 및 이용해본 적이 있어요": completed at once, then its completionMessage.
  skip: () => void;
  // 퀘스트 완료: completes the quest unless it is, closes the sheet and opens the list on the next quest.
  finish: () => void;
  // 그냥 완료 after a check that found nothing: completed `forced`, then as 퀘스트 완료.
  forceDone: () => void;
}

type SetList = (list: ListView | null) => void;
type SetSheet = (change: (sheet: SheetView | null) => SheetView | null) => void;

// The list once a quest is completed: on the next quest, or "n / n".
function listAfter(after: Tutorial, key: string): ListView {
  const next = after.state === 'finished' ? null : nextAfter(after.quests, key);
  const quest = next === null ? undefined : after.quests[next];
  return quest === undefined
    ? { kind: 'done' }
    : { kind: 'list', category: quest.category ?? '', banner: key, next: quest.key };
}

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

function freshSheet(key: string, mode: SheetView['mode'] = 'info'): SheetView {
  return { key, mode, completed: false, completeAs: 'button', booking: null };
}

// Runs the check for a quest's sheet, which shows it running until it ends.
function runCheckFor(key: string, setSheet: SetSheet, runCheck: () => Promise<KwanjeongCheck>): void {
  setSheet((shown) =>
    shown?.key === key ? { ...shown, mode: 'checking', booking: null } : freshSheet(key, 'checking'),
  );
  void runCheck().then((result) => {
    setSheet((shown) => afterCheck(shown, key, result));
  });
}

type SheetActions = Pick<TutorialFlow, 'saidDone' | 'check' | 'skip' | 'finish' | 'forceDone'>;

interface SheetDeps {
  sheet: SheetView | null;
  setSheet: SetSheet;
  setList: SetList;
  tutorial: Tutorial | undefined;
  complete: TutorialActions['complete'];
  runCheck: () => Promise<KwanjeongCheck>;
}

// What the sheet's buttons do once the User says the quest is done.
function sheetActions({ sheet, setSheet, setList, tutorial, complete, runCheck }: SheetDeps): SheetActions {
  const moveOn = (by: TutorialCompletedBy): void => {
    if (sheet === null) {
      return;
    }
    const { key } = sheet;
    const completing = sheet.completed ? Promise.resolve(tutorial ?? null) : complete(key, by);
    void completing.then((after) => {
      if (after !== null) {
        setSheet(() => null);
        setList(listAfter(after, key));
      }
    });
  };
  return {
    saidDone: () => {
      setSheet((shown) => (shown === null ? null : { ...shown, mode: 'message', completeAs: 'button' }));
    },
    check: () => {
      if (sheet !== null && sheet.mode !== 'checking') {
        runCheckFor(sheet.key, setSheet, runCheck);
      }
    },
    skip: () => {
      if (sheet !== null) {
        void complete(sheet.key, 'skipped').then((after) => {
          if (after !== null) {
            setSheet(() => ({ ...sheet, mode: 'message', completed: true, booking: null }));
          }
        });
      }
    },
    finish: () => {
      moveOn(sheet?.completeAs ?? 'button');
    },
    forceDone: () => {
      moveOn('forced');
    },
  };
}

function useList(tutorial: Tutorial | undefined): {
  list: ListView | null;
  setList: SetList;
} & Pick<TutorialFlow, 'openList' | 'showCategory' | 'closeList'> {
  const [list, setList] = useState<ListView | null>(null);
  const openList = useCallback(() => {
    const category = tutorial === undefined ? null : firstCategory(tutorial);
    setList({ kind: 'list', category: category ?? '', banner: null, next: null });
  }, [tutorial]);
  const showCategory = useCallback((category: string) => {
    setList((shown) => (shown === null ? shown : { kind: 'list', category, banner: null, next: null }));
  }, []);
  const closeList = useCallback(() => {
    setList(null);
  }, []);
  return { list, setList, openList, showCategory, closeList };
}

interface QuestDeps {
  tutorial: Tutorial | undefined;
  actions: TutorialActions;
  setList: SetList;
  setSheet: SetSheet;
  guide: TutorialGuideFlow;
}

// What opens a quest, closes its sheet, and stops the tutorial.
function questActions({
  tutorial,
  actions,
  setList,
  setSheet,
  guide,
}: QuestDeps): Pick<TutorialFlow, 'openQuest' | 'stop' | 'closeSheet'> {
  return {
    openQuest: (key) => {
      const quest = tutorial?.quests.find((one) => one.key === key);
      if (quest === undefined) {
        return;
      }
      if (quest.status === 'notStarted') {
        void actions.start(key);
      }
      setList(null);
      if (quest.guide === undefined) {
        setSheet(() => freshSheet(key));
      } else {
        guide.openGuide(key);
      }
    },
    stop: () => {
      void actions.stop().then((after) => {
        if (after !== null) {
          setList(null);
          setSheet(() => null);
          guide.closeGuide();
        }
      });
    },
    closeSheet: () => {
      setSheet(() => null);
    },
  };
}

export function useTutorialFlow(): TutorialFlow {
  const tutorial = useTutorial();
  const actions = useTutorialActions();
  const { list, setList, openList, showCategory, closeList } = useList(tutorial);
  const [sheet, setSheet] = useState<SheetView | null>(null);
  const { logIn } = useLibrarySession();
  const runCheck = (): Promise<KwanjeongCheck> => checkKwanjeong(library, logIn, new Date());
  const guide = useGuideFlow({
    tutorial,
    complete: actions.complete,
    onList: (category) => {
      setList({ kind: 'list', category, banner: null, next: null });
    },
    onCompleted: (after, key) => {
      setList(listAfter(after, key));
    },
    // The 관정 quest served as checked: its ✓ 완료 runs the sheet's check (MainTutorialKwOk, MainTutorialFail).
    onCheck: (key) => {
      runCheckFor(key, setSheet, runCheck);
    },
  });
  return {
    ...guide,
    tutorial,
    actions,
    list,
    sheet,
    openList,
    showCategory,
    closeList,
    ...questActions({ tutorial, actions, setList, setSheet, guide }),
    ...sheetActions({ sheet, setSheet, setList, tutorial, complete: actions.complete, runCheck }),
  };
}
