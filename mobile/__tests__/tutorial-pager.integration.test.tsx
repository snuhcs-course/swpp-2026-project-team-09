/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { pass, screen } from './support/app';
import { AI_INPUT, button, findButton, FULL_SCREEN } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND } from './support/markers';
import { answered, startFresh } from './support/mocks';
import {
  NEXT,
  openAsFreshman,
  pressAndWait,
  PREVIOUS,
  QUEST_KEYS,
  S_CARD_ROW,
  SHEET,
  START,
  started,
} from './support/tutorial';
import { within } from '@testing-library/react-native';
import { apiClient } from '@/api/client';

// The 새내기 튜토리얼's start button, pager and quest list group on the main screen, against the mocks
// (MainTutorialStart, MainTutorialList and the P06 spec's pager). A 26학번 User is eligible by default, so the
// tutorial is `available` at the first read.

const MEALS_ROW = '새내기 튜토리얼 · 생활 · 2/15 · 천원의 식사 이용하기 · 완료 조건 · 천원의 식사로 한 끼 먹어 보기';
const CATEGORIES = ['생활', '공부·학사', '이동', '건강', '문화·여가'];

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the start button', () => {
  it('shows for a User eligible by default and opens the pager on the first quest', async () => {
    const user = await openAsFreshman();

    await pressAndWait(user, START);

    expect(screen.getByText('새내기 튜토리얼 1/15')).toBeVisible();
    expect(screen.getByRole('header', { name: '학생증(S-CARD) 발급받기' })).toBeVisible();
    expect(screen.getByText('학생증(S-CARD)을 신청하고 받아 보세요.')).toBeVisible();
    expect(button('퀘스트 시작')).toBeVisible();
    expect(button('튜토리얼 그만하기')).toBeVisible();
    expect(button('닫기')).toBeVisible();
  });

  it('is not there for a User who never turned the tutorial on', async () => {
    await openMain();

    expect(findButton(START)).toBeNull();
  });

  it('gives way to an open card and to the chat', async () => {
    const user = await openAsFreshman();
    expect(button(START)).toBeVisible();

    await user.press(screen.getByRole('button', { name: FRIEND }));
    expect(findButton(START)).toBeNull();
    await user.press(button('닫기'));
    expect(button(START)).toBeVisible();

    await user.press(screen.getByLabelText(AI_INPUT));
    expect(findButton(START)).toBeNull();
  });

  it('stays while a quest is not started, and goes once every quest is', async () => {
    await started(...QUEST_KEYS.slice(0, -1));
    const user = await openAsFreshman();
    expect(button(START)).toBeVisible();

    await pressAndWait(user, START);
    expect(screen.getByText('새내기 튜토리얼 15/15')).toBeVisible();
    await pressAndWait(user, '퀘스트 시작');
    await user.press(button('닫기'));

    expect(findButton(START)).toBeNull();
  });
});

describe('the pager', () => {
  it('pages with ◀ ▶, which the ends turn off', async () => {
    const user = await openAsFreshman();
    await pressAndWait(user, START);
    expect(button(PREVIOUS)).toBeDisabled();

    await user.press(button(NEXT));
    expect(screen.getByText('새내기 튜토리얼 2/15')).toBeVisible();
    expect(screen.getByRole('header', { name: '천원의 식사 이용하기' })).toBeVisible();
    expect(button(PREVIOUS)).toBeEnabled();

    for (let presses = 0; presses < 13; presses += 1) {
      // oxlint-disable-next-line no-await-in-loop
      await user.press(button(NEXT));
    }
    expect(screen.getByText('새내기 튜토리얼 15/15')).toBeVisible();
    expect(button(NEXT)).toBeDisabled();

    await user.press(button(PREVIOUS));
    expect(screen.getByText('새내기 튜토리얼 14/15')).toBeVisible();
  });

  it('opens on the first quest not started', async () => {
    await started('s-card', 'thousand-won-meals');
    const user = await openAsFreshman();

    await pressAndWait(user, START);

    expect(screen.getByText('새내기 튜토리얼 3/15')).toBeVisible();
    await user.press(button(PREVIOUS));
    expect(screen.getByText('진행 중')).toBeVisible();
    expect(button('내용 보기')).toBeVisible();
  });
});

describe("the pager's Tutorial Categories", () => {
  it("shows the five categories' chips, and the shown quest's category over its title", async () => {
    const user = await openAsFreshman();

    await pressAndWait(user, START);

    expect(CATEGORIES.map((label) => button(label))).toHaveLength(5);
    expect(button('생활')).toBeSelected();
    expect(button('이동')).not.toBeSelected();
    expect(screen.getAllByText('생활')).toHaveLength(2);
  });

  it("moves to the category's first quest not started, keeping n/N over all fifteen", async () => {
    await started('admin-shuttle');
    const user = await openAsFreshman();
    await pressAndWait(user, START);

    await user.press(button('이동'));

    expect(screen.getByText('새내기 튜토리얼 10/15')).toBeVisible();
    expect(screen.getByRole('header', { name: '야간 셔틀 타기' })).toBeVisible();
    expect(button('이동')).toBeSelected();
    expect(button('생활')).not.toBeSelected();
  });

  it("moves to the category's first quest once every one of them is started", async () => {
    await started('art-museum', 'dure-practice-room', 'gwanaksan-engineering-trail');
    const user = await openAsFreshman();
    await pressAndWait(user, START);

    await user.press(button('문화·여가'));

    expect(screen.getByText('새내기 튜토리얼 13/15')).toBeVisible();
    expect(screen.getByRole('header', { name: '서울대 미술관/파워플랜트 관람' })).toBeVisible();
  });
});

describe('퀘스트 시작', () => {
  it('starts a quest: it shows 진행 중 and 내용 보기, and sits on top of the quest list', async () => {
    const user = await openAsFreshman();
    await pressAndWait(user, START);

    await pressAndWait(user, '퀘스트 시작');

    expect(screen.getByText('진행 중')).toBeVisible();
    expect(button('내용 보기')).toBeVisible();
    await user.press(button('닫기'));
    expect(button(S_CARD_ROW)).toBeVisible();
    expect(screen.getByTestId('quest-count')).toHaveTextContent('4');
    expect((await answered(apiClient.getTutorial())).state).toBe('active');
  });

  it('starts several quests, each on top of the quest list in order', async () => {
    const user = await openAsFreshman();
    await pressAndWait(user, START);
    await pressAndWait(user, '퀘스트 시작');
    await user.press(button(NEXT));
    await pressAndWait(user, '퀘스트 시작');
    await user.press(button('닫기'));

    const rows = screen.getAllByRole('button', { name: /새내기 튜토리얼 · /u });
    expect(rows).toEqual([button(S_CARD_ROW), button(MEALS_ROW)]);
  });

  it('opens the sheet of a started quest with 내용 보기', async () => {
    await started('s-card');
    const user = await openAsFreshman();
    await pressAndWait(user, START);
    await user.press(button(PREVIOUS));

    await user.press(button('내용 보기'));
    await pass(500);

    expect(screen.getByLabelText(SHEET)).toBeVisible();
    expect(within(screen.getByLabelText(SHEET)).getByText('새내기 튜토리얼 · 생활 · 1/15')).toBeVisible();
    expect(screen.queryByText('새내기 튜토리얼 1/15')).toBeNull();
  });
});

describe('the quest list group', () => {
  it('shows the started quests on top of the Quest list on the whole screen, under "새내기 튜토리얼"', async () => {
    await started('s-card');
    const user = await openAsFreshman();

    await user.press(button(FULL_SCREEN));
    await pass(500);

    expect(screen.getByText('새내기 튜토리얼')).toBeVisible();
    expect(button(S_CARD_ROW)).toBeVisible();
    expect(screen.getByText('전체 4')).toBeVisible();
  });

  it('opens the sheet on the main screen from the whole screen', async () => {
    await started('s-card');
    const user = await openAsFreshman();
    await user.press(button(FULL_SCREEN));
    await pass(500);

    await user.press(button(S_CARD_ROW));
    await pass(1000);

    expect(within(screen.getByLabelText(SHEET)).getByText('새내기 튜토리얼 · 생활 · 1/15')).toBeVisible();
    expect(screen.getByRole('header', { name: '학생증(S-CARD) 발급받기' })).toBeVisible();
  });
});
