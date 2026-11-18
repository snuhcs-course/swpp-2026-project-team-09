/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Tutorial, TutorialQuest } from '@/api/tutorial-types';

// What the 새내기 튜토리얼 shows where, from the main server's state (P06 spec "The state, derived" and "App"). Who is
// eligible by default is the server's rule alone: the app reads its answer's `eligibleByDefault`.

// The start button at the bottom of the main screen (MainTutorialStart): while the tutorial is `available`, and while
// it is `active` with a quest not completed, since it is the one way back to the list (MainTutorialList: "퀘스트
// 목록에는 안 뜸"). What hides it over the map (a card, the chat, a guide) is the screen's.
export function showsStartButton(tutorial: Tutorial | undefined): boolean {
  if (tutorial === undefined) {
    return false;
  }
  return (
    tutorial.state === 'available' ||
    (tutorial.state === 'active' && tutorial.quests.some(({ status }) => status !== 'completed'))
  );
}

// "n/N": a quest's place in the tutorial.
export function stepOf(tutorial: Tutorial, key: string): string {
  return `${tutorial.quests.findIndex((quest) => quest.key === key) + 1}/${tutorial.quests.length}`;
}

// The label of a quest's Tutorial Category, or null for a quest without one.
export function categoryOf(tutorial: Tutorial, quest: TutorialQuest): string | null {
  return tutorial.categories.find(({ key }) => key === quest.category)?.label ?? null;
}

// The kicker of the quest list's rows and of the sheet: "새내기 튜토리얼 · {category} · n/N".
export function kickerOf(tutorial: Tutorial, quest: TutorialQuest): string {
  const category = categoryOf(tutorial, quest);
  return ['새내기 튜토리얼', ...(category === null ? [] : [category]), stepOf(tutorial, quest.key)].join(' · ');
}

// The category the list opens on (MainTutorialPager): that of the first quest not completed, else the first one.
export function firstCategory(tutorial: Tutorial): string | null {
  const open = tutorial.quests.find(({ status }) => status !== 'completed');
  return open?.category ?? tutorial.categories[0]?.key ?? null;
}

// The quest the list marks 다음 once a quest is completed (MainTutorialNext): the next quest not started after it,
// else the first not started before it, else a started one still to complete; null when every quest is completed.
export function nextAfter(quests: readonly TutorialQuest[], completedKey: string): number | null {
  const from = quests.findIndex(({ key }) => key === completedKey);
  const order = [...quests.keys()].map((index) => (from + 1 + index) % quests.length);
  const next =
    order.find((index) => quests[index]?.status === 'notStarted') ??
    order.find((index) => quests[index]?.status === 'started');
  return next ?? null;
}

// The 내 정보 row (ProfileTutorial): its line and its buttons by the state. `enable` is 진행하기, `stop` is 끄기 or
// 그만하기 by `stopLabel`, `hide` is the ✕. Null while the row is hidden.
export interface TutorialRowView {
  line: string;
  enable: boolean;
  stopLabel: '끄기' | '그만하기' | null;
  hide: boolean;
}

const NO_BUTTONS = { enable: false, stopLabel: null, hide: false } as const;

function activeRow(tutorial: Tutorial): TutorialRowView {
  const done = tutorial.quests.filter(({ status }) => status === 'completed').length;
  return {
    ...NO_BUTTONS,
    line: `진행 중 · 완료 ${done}/${tutorial.quests.length} · 지도 화면 아래 버튼으로 이어서 해요`,
    stopLabel: '그만하기',
  };
}

// A finished User whose content gained a quest after the end may take it up again.
function finishedRow(tutorial: Tutorial): TutorialRowView {
  return tutorial.quests.some(({ status }) => status !== 'completed')
    ? { ...NO_BUTTONS, line: '모두 완료했어요 · 새 퀘스트가 있어요', enable: true }
    : { ...NO_BUTTONS, line: '모두 완료했어요' };
}

export function rowOf(tutorial: Tutorial): TutorialRowView | null {
  const { state } = tutorial;
  if (state === 'off') {
    return tutorial.rowHidden
      ? null
      : { line: '학교생활이 처음이라면\n퀘스트로 하나씩 익혀 보세요', enable: true, stopLabel: null, hide: true };
  }
  if (state === 'available') {
    return tutorial.eligibleByDefault
      ? { ...NO_BUTTONS, line: '지도 화면 아래 버튼으로 시작할 수 있어요' }
      : { ...NO_BUTTONS, line: '켜 두었어요 · 지도 화면 아래 버튼으로 시작해요', stopLabel: '끄기' };
  }
  if (state === 'stopped') {
    return { ...NO_BUTTONS, line: '그만두었어요 · 다시 하려면 진행하기를 눌러요', enable: true };
  }
  return state === 'active' ? activeRow(tutorial) : finishedRow(tutorial);
}
