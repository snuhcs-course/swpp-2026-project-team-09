/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { hideKeyboard, KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT, button, findButton, FULL_SCREEN } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND } from './support/markers';
import { answered, startFresh } from './support/mocks';
import {
  completed,
  LIST,
  openAsFreshman,
  pressAndWait,
  QUEST_KEYS,
  rowName,
  START,
  started,
  TO_LIST,
} from './support/tutorial';
import { apiClient } from '@/api/client';

// The 새내기 튜토리얼's start button and its list on the main screen, against the mocks (MainTutorialStart,
// MainTutorialPager, MainTutorialList, MainTutorialNext and MainTutorialDone, P15 ticket 53). A 26학번 User is eligible
// by default, so the tutorial is `available` at the first read.

const CATEGORIES = ['생활', '공부·학사', '이동', '건강', '문화·여가'];
const LIFE = [
  '학생증(S-CARD) 발급받기',
  '천원의 식사 이용하기',
  '분실물센터 위치 알아두기',
  '노트북 대여 서비스 알아두기',
];

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

// Each quest is reached through the start button, the list and its tab: longer than a press on a row.
jest.setTimeout(150000);

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function list(): ReturnType<typeof within> {
  return within(screen.getByLabelText(LIST));
}

describe('the start button', () => {
  it('shows for a User eligible by default and opens the list on 생활', async () => {
    const user = await openAsFreshman();

    await pressAndWait(user, START);

    expect(list().getByRole('header', { name: '새내기 튜토리얼' })).toBeVisible();
    expect(list().getByText('생활 0/4')).toBeVisible();
    expect(list().getByText('0 / 15')).toBeVisible();
    expect(CATEGORIES.map((label) => list().getByRole('tab', { name: label }))).toHaveLength(5);
    expect(list().getByRole('tab', { name: '생활' })).toBeSelected();
    expect(LIFE.map((title) => list().getByRole('button', { name: title }))).toHaveLength(4);
    expect(list().getByRole('button', { name: '튜토리얼 그만하기' })).toBeVisible();
    expect(list().queryByText('퀘스트 시작')).toBeNull();
  });
});

describe('the start button, shown or not', () => {
  it('is not there for a User who never turned the tutorial on', async () => {
    await openMain();

    expect(findButton(START)).toBeNull();
  });

  // Since the chat sheet went (P02-04), pressing the bar raises the keyboard, and the examples stand above it.
  it('gives way to an open card and to the keyboard of the AI input', async () => {
    const user = await openAsFreshman();
    expect(button(START)).toBeVisible();

    await user.press(screen.getByRole('button', { name: FRIEND }));
    expect(findButton(START)).toBeNull();
    await user.press(button('닫기'));
    expect(button(START)).toBeVisible();

    await user.press(screen.getByLabelText(AI_INPUT));
    await showKeyboard(KEYBOARD);
    expect(findButton(START)).toBeNull();
    await hideKeyboard();
    expect(button(START)).toBeVisible();
  });

  it('stays while every quest is started and none completed', async () => {
    await started(...QUEST_KEYS);

    await openAsFreshman();

    expect(button(START)).toBeVisible();
  });

  it('is gone once every quest is completed', async () => {
    await completed(...QUEST_KEYS);

    await openAsFreshman();

    expect(findButton(START)).toBeNull();
  });
});

describe("the list's categories", () => {
  it('opens on the category of the first quest not completed, and a tab shows its own', async () => {
    await completed('s-card', 'thousand-won-meals', 'lost-and-found', 'laptop-rental');
    await started('kwanjeong');
    const user = await openAsFreshman();

    await pressAndWait(user, START);
    expect(list().getByRole('tab', { name: '공부·학사' })).toBeSelected();
    expect(list().getByText('공부·학사 0/4')).toBeVisible();
    expect(list().getByText('4 / 15')).toBeVisible();
    expect(list().getByRole('button', { name: rowName('kwanjeong', ' · 진행 중') })).toBeVisible();
    expect(list().getByText('진행 중')).toBeVisible();

    await user.press(list().getByRole('tab', { name: '생활' }));

    expect(list().getByText('생활 4/4')).toBeVisible();
    expect(list().getByRole('button', { name: rowName('s-card', ' · 완료') })).toBeVisible();
  });
});

describe("a quest's row", () => {
  it('starts the quest and opens its guide; the quest is on no Quest list', async () => {
    const user = await openAsFreshman();
    await pressAndWait(user, START);

    await pressAndWait(user, rowName('lost-and-found'));

    expect(screen.queryByLabelText(LIST)).toBeNull();
    expect(button(TO_LIST)).toBeVisible();
    expect(screen.getByText('분실물센터 위치 알아두기')).toBeVisible();
    const tutorial = await answered(apiClient.getTutorial());
    expect(tutorial.state).toBe('active');
    expect(tutorial.quests[2]?.status).toBe('started');

    await user.press(button('닫기'));
    expect(screen.queryAllByRole('button', { name: /새내기 튜토리얼 · /u })).toEqual([]);
    expect(screen.getByTestId('quest-count')).toHaveTextContent('3');
  });

  it('leaves the whole-screen Quest list without the tutorial', async () => {
    await started('s-card');
    const user = await openAsFreshman();

    await user.press(button(FULL_SCREEN));
    await pass(500);

    expect(screen.queryByText('새내기 튜토리얼')).toBeNull();
    expect(screen.getByText('전체 3')).toBeVisible();
  });
});

describe('completing a quest from its guide', () => {
  it('opens the list on the next quest, with the banner and 다음', async () => {
    const user = await openAsFreshman();
    await pressAndWait(user, START);
    await pressAndWait(user, rowName('lost-and-found'));

    await pressAndWait(user, '완료');

    expect(list().getAllByText('분실물센터 위치 알아두기')).toHaveLength(2);
    expect(list().getByText('다음')).toBeVisible();
    expect(list().getByText('생활 1/4')).toBeVisible();
    expect((await answered(apiClient.getTutorial())).quests[2]?.status).toBe('completed');
  });

  it('shows n / n after the last quest', async () => {
    await completed(...QUEST_KEYS.filter((key) => key !== 'admin-shuttle'));
    const user = await openAsFreshman();
    await pressAndWait(user, START);
    await pressAndWait(user, rowName('admin-shuttle'));

    await pressAndWait(user, '완료');

    expect(list().getByRole('header', { name: '15 / 15' })).toBeVisible();
    await user.press(list().getAllByRole('button', { name: '닫기' }).at(-1) ?? button('닫기'));
    expect(findButton(START)).toBeNull();
  });
});
