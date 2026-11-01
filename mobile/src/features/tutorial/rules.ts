/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Tutorial, TutorialQuest } from '@/api/tutorial-types';
import { koreaYear } from '@/korea-time';

// What the 새내기 튜토리얼 shows where, from the main server's state (P06 spec "The state, derived" and "App").

// Eligible by default, by the main server's rule read now: admitted this year in Korea or later, or 소속 교환학생.
// `affiliation` is ticket P06-01's; a profile without it is not an exchange student.
export function eligibleByDefault(
  profile: { admissionYear: number | null; affiliation?: string | null },
  now: Date,
): boolean {
  return (
    profile.affiliation === 'exchange' || (profile.admissionYear !== null && profile.admissionYear >= koreaYear(now))
  );
}

// The start button at the bottom of the main screen: while the tutorial is `available`, and while it is `active`
// with a quest not started. What hides it over the map (a card, the chat) is the screen's.
export function showsStartButton(tutorial: Tutorial | undefined): boolean {
  if (tutorial === undefined) {
    return false;
  }
  return (
    tutorial.state === 'available' ||
    (tutorial.state === 'active' && tutorial.quests.some(({ status }) => status === 'notStarted'))
  );
}

// The quests on top of the quest list, in the group "새내기 튜토리얼": those started and not completed, while the
// tutorial is `active`.
export function questsInList(tutorial: Tutorial | undefined): TutorialQuest[] {
  if (tutorial?.state !== 'active') {
    return [];
  }
  return tutorial.quests.filter(({ status }) => status === 'started');
}

// "n/N": a quest's place in the tutorial.
export function stepOf(tutorial: Tutorial, key: string): string {
  return `${tutorial.quests.findIndex((quest) => quest.key === key) + 1}/${tutorial.quests.length}`;
}

// Where the pager opens: on the first quest not started, or on the first one without one.
export function firstNotStarted(quests: readonly TutorialQuest[]): number {
  return Math.max(
    0,
    quests.findIndex(({ status }) => status === 'notStarted'),
  );
}

// Where the pager goes once a quest is completed: the next quest not started after it, else the first not started
// before it, else a started one still to complete; null when every quest is completed.
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
    line: `진행 중 · 완료 ${done}/${tutorial.quests.length} · 지도의 퀘스트 목록에서 이어서 해요`,
    stopLabel: '그만하기',
  };
}

// A finished User whose content gained a quest after the end may take it up again.
function finishedRow(tutorial: Tutorial): TutorialRowView {
  return tutorial.quests.some(({ status }) => status !== 'completed')
    ? { ...NO_BUTTONS, line: '모두 완료했어요 · 새 퀘스트가 있어요', enable: true }
    : { ...NO_BUTTONS, line: '모두 완료했어요' };
}

export function rowOf(tutorial: Tutorial, eligible: boolean): TutorialRowView | null {
  const { state } = tutorial;
  if (state === 'off') {
    return tutorial.rowHidden === true
      ? null
      : { line: '학교생활이 처음이라면\n퀘스트로 하나씩 익혀 보세요', enable: true, stopLabel: null, hide: true };
  }
  if (state === 'available') {
    return eligible
      ? { ...NO_BUTTONS, line: '지도 화면 아래 버튼으로 시작할 수 있어요' }
      : { ...NO_BUTTONS, line: '켜 두었어요 · 지도 화면 아래 버튼으로 시작해요', stopLabel: '끄기' };
  }
  if (state === 'stopped') {
    return { ...NO_BUTTONS, line: '그만두었어요 · 다시 하려면 진행하기를 눌러요', enable: true };
  }
  return state === 'active' ? activeRow(tutorial) : finishedRow(tutorial);
}
