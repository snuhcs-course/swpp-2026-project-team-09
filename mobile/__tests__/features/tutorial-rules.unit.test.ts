/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Tutorial, TutorialQuest, TutorialQuestStatus, TutorialState } from '@/api/tutorial-types';
import {
  eligibleByDefault,
  firstNotStarted,
  nextAfter,
  questsInList,
  rowOf,
  showsStartButton,
  stepOf,
} from '@/features/tutorial/rules';

// What the 새내기 튜토리얼 shows where, by the main server's state and the quests' statuses.

function quest(key: string, status: TutorialQuestStatus): TutorialQuest {
  return {
    key,
    order: 0,
    title: key,
    brief: '',
    body: [],
    condition: '',
    completion: { kind: 'button' },
    completionMessage: '',
    places: [],
    links: [],
    status,
  };
}

function tutorialOf(state: TutorialState, ...statuses: TutorialQuestStatus[]): Tutorial {
  return { state, quests: statuses.map((status, index) => quest(`q${index + 1}`, status)) };
}

const IN_2026 = new Date('2026-10-01T04:37:00Z');

describe('eligible by default', () => {
  it.each([
    [2026, null, true],
    [2027, null, true],
    [2025, null, false],
    [null, null, false],
    [2022, 'exchange', true],
    [2022, 'undergraduate', false],
  ])('admitted in %p, 소속 %p: %p', (admissionYear, affiliation, eligible) => {
    expect(eligibleByDefault({ admissionYear, affiliation }, IN_2026)).toBe(eligible);
  });

  it('counts the year in Korea: 1 January in Korea is still 31 December in UTC', () => {
    expect(eligibleByDefault({ admissionYear: 2027 }, new Date('2026-12-31T16:00:00Z'))).toBe(true);
  });
});

describe('the start button', () => {
  it.each<[string, Tutorial | undefined, boolean]>([
    ['not known yet', undefined, false],
    ['off', tutorialOf('off', 'notStarted'), false],
    ['available', tutorialOf('available', 'notStarted', 'notStarted'), true],
    ['active with a quest not started', tutorialOf('active', 'started', 'notStarted'), true],
    ['active with every quest started', tutorialOf('active', 'started', 'completed'), false],
    ['stopped', tutorialOf('stopped', 'started', 'notStarted'), false],
    ['finished', tutorialOf('finished', 'completed', 'notStarted'), false],
  ])('%s: %p', (_, tutorial, shown) => {
    expect(showsStartButton(tutorial)).toBe(shown);
  });
});

describe('the quest list group', () => {
  it('holds the started quests that are not completed, while active', () => {
    const shown = questsInList(tutorialOf('active', 'completed', 'started', 'notStarted', 'started'));

    expect(shown.map(({ key }) => key)).toEqual(['q2', 'q4']);
  });

  it.each<TutorialState>(['off', 'available', 'stopped', 'finished'])('is empty while %s', (state) => {
    expect(questsInList(tutorialOf(state, 'started', 'started'))).toEqual([]);
  });

  it('numbers a quest by its place', () => {
    expect(stepOf(tutorialOf('active', 'started', 'started', 'notStarted'), 'q2')).toBe('2/3');
  });
});

describe('the pager', () => {
  it('opens on the first quest not started', () => {
    expect(firstNotStarted(tutorialOf('active', 'started', 'completed', 'notStarted').quests)).toBe(2);
  });

  it('opens on the first quest when every quest is started', () => {
    expect(firstNotStarted(tutorialOf('active', 'started', 'started').quests)).toBe(0);
  });

  it('goes on to the next quest not started after the one completed', () => {
    const { quests } = tutorialOf('active', 'notStarted', 'completed', 'started', 'notStarted');

    expect(nextAfter(quests, 'q2')).toBe(3);
  });

  it('comes round to a quest not started before it', () => {
    const { quests } = tutorialOf('active', 'notStarted', 'completed', 'completed');

    expect(nextAfter(quests, 'q3')).toBe(0);
  });

  it('goes to a started quest when none is left to start', () => {
    const { quests } = tutorialOf('active', 'completed', 'started', 'completed');

    expect(nextAfter(quests, 'q3')).toBe(1);
  });

  it('has no next quest once every quest is completed', () => {
    expect(nextAfter(tutorialOf('finished', 'completed', 'completed').quests, 'q2')).toBeNull();
  });
});

describe('the 내 정보 row', () => {
  it('offers 진행하기 and the ✕ while off', () => {
    expect(rowOf(tutorialOf('off', 'notStarted'), false)).toEqual({
      line: '학교생활이 처음이라면\n퀘스트로 하나씩 익혀 보세요',
      enable: true,
      stopLabel: null,
      hide: true,
    });
  });

  it('is gone once its ✕ was pressed while off', () => {
    expect(rowOf({ ...tutorialOf('off', 'notStarted'), rowHidden: true }, false)).toBeNull();
  });
});

describe('the 내 정보 row while on', () => {
  it('points to the map without a button for a User eligible by default', () => {
    expect(rowOf(tutorialOf('available', 'notStarted'), true)).toEqual({
      line: '지도 화면 아래 버튼으로 시작할 수 있어요',
      enable: false,
      stopLabel: null,
      hide: false,
    });
  });

  it('offers 끄기 for a User who turned it on', () => {
    expect(rowOf(tutorialOf('available', 'notStarted'), false)).toMatchObject({
      line: '켜 두었어요 · 지도 화면 아래 버튼으로 시작해요',
      stopLabel: '끄기',
      enable: false,
    });
  });

  it('counts the completed quests and offers 그만하기 while active', () => {
    expect(rowOf(tutorialOf('active', 'completed', 'started', 'notStarted'), true)).toMatchObject({
      line: '진행 중 · 완료 1/3 · 지도의 퀘스트 목록에서 이어서 해요',
      stopLabel: '그만하기',
    });
  });
});

describe('the 내 정보 row once stopped or finished', () => {
  it('offers 진행하기 once stopped', () => {
    expect(rowOf(tutorialOf('stopped', 'started'), true)).toMatchObject({
      line: '그만두었어요 · 다시 하려면 진행하기를 눌러요',
      enable: true,
      stopLabel: null,
    });
  });

  it('says all is done once finished', () => {
    expect(rowOf(tutorialOf('finished', 'completed', 'completed'), true)).toEqual({
      line: '모두 완료했어요',
      enable: false,
      stopLabel: null,
      hide: false,
    });
  });

  it('offers the quests added after the end with 진행하기', () => {
    expect(rowOf(tutorialOf('finished', 'completed', 'notStarted'), true)).toMatchObject({
      line: '모두 완료했어요 · 새 퀘스트가 있어요',
      enable: true,
    });
  });
});
