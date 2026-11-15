/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { pass, screen } from './support/app';
import { button, findButton } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { answered, startFresh } from './support/mocks';
import { apiClient } from '@/api/client';
import { TUTORIAL_CONTENT } from '@/api/mock/data/tutorial';

// The 새내기 튜토리얼 row of 내 정보 (ProfileTutorial) in each state, against the mocks, and 진행하기 bringing the
// tutorial back to the main screen with its progress.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const OFF_LINE = '학교생활이 처음이라면\n퀘스트로 하나씩 익혀 보세요';
const HIDE = '새내기 튜토리얼 안 보기';
const START = '새내기 튜토리얼 시작하기';
const S_CARD_ROW = '새내기 튜토리얼 · 생활 · 1/15 · 학생증(S-CARD) 발급받기 · 완료 조건 · 학생증 받기';

type User = Awaited<ReturnType<typeof openMain>>;

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function openMe(admissionYear = 2022): Promise<User> {
  const user = await openMain({
    answers: {
      name: '홍길동',
      department: '컴퓨터공학부',
      admissionYear,
      hashtags: [],
      courseLevel: 'undergraduate',
      gender: null,
    },
  });
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

async function pressAndWait(user: User, name: string): Promise<void> {
  await user.press(button(name));
  await pass(500);
}

describe('while the tutorial is off', () => {
  it('offers 진행하기 and the ✕', async () => {
    await openMe();

    expect(screen.getByText('새내기 튜토리얼')).toBeVisible();
    expect(screen.getByText(OFF_LINE)).toBeVisible();
    expect(button('진행하기')).toBeVisible();
    expect(button(HIDE)).toBeVisible();
  });

  it('hides the row for good with the ✕', async () => {
    const user = await openMe();

    await pressAndWait(user, HIDE);

    expect(screen.queryByText(OFF_LINE)).toBeNull();
    expect((await answered(apiClient.getTutorial())).rowHidden).toBe(true);
  });

  it('turns the tutorial on with 진행하기: the row offers 끄기, and the map has the start button', async () => {
    const user = await openMe();

    await pressAndWait(user, '진행하기');

    expect(screen.getByText('켜 두었어요 · 지도 화면 아래 버튼으로 시작해요')).toBeVisible();
    expect(button('끄기')).toBeVisible();
    expect(findButton(HIDE)).toBeNull();
    await user.press(screen.getByRole('tab', { name: '지도' }));
    await pass(500);
    expect(button(START)).toBeVisible();
  });

  it('turns it off again with 끄기', async () => {
    const user = await openMe();
    await pressAndWait(user, '진행하기');

    await pressAndWait(user, '끄기');

    expect(screen.getByText('그만두었어요 · 다시 하려면 진행하기를 눌러요')).toBeVisible();
    expect(button('진행하기')).toBeVisible();
  });
});

describe('for a User eligible by default', () => {
  it('points to the button on the map, with no button of its own', async () => {
    await openMe(2026);

    expect(screen.getByText('지도 화면 아래 버튼으로 시작할 수 있어요')).toBeVisible();
    expect(findButton('진행하기')).toBeNull();
    expect(findButton('끄기')).toBeNull();
  });
});

describe('while the tutorial is active', () => {
  it('counts the completed quests and offers 그만하기', async () => {
    await answered(apiClient.enableTutorial());
    await answered(apiClient.startTutorialQuest('s-card'));
    await answered(apiClient.startTutorialQuest('admin-shuttle'));
    await answered(apiClient.completeTutorialQuest('admin-shuttle', 'button'));
    await openMe();

    expect(screen.getByText('진행 중 · 완료 1/15 · 지도의 퀘스트 목록에서 이어서 해요')).toBeVisible();
    expect(button('그만하기')).toBeVisible();
  });

  it('stops with 그만하기, and 진행하기 brings it back with the progress kept', async () => {
    await answered(apiClient.enableTutorial());
    await answered(apiClient.startTutorialQuest('s-card'));
    const user = await openMe();

    await pressAndWait(user, '그만하기');
    expect(screen.getByText('그만두었어요 · 다시 하려면 진행하기를 눌러요')).toBeVisible();
    await user.press(screen.getByRole('tab', { name: '지도' }));
    await pass(500);
    expect(findButton(START)).toBeNull();
    expect(findButton(S_CARD_ROW)).toBeNull();

    await user.press(screen.getByRole('tab', { name: '내 정보' }));
    await pressAndWait(user, '진행하기');
    expect(screen.getByText('진행 중 · 완료 0/15 · 지도의 퀘스트 목록에서 이어서 해요')).toBeVisible();
    await user.press(screen.getByRole('tab', { name: '지도' }));
    await pass(500);
    expect(button(START)).toBeVisible();
    expect(button(S_CARD_ROW)).toBeVisible();
  });
});

describe('once the tutorial is finished', () => {
  it('says all is done, with no button', async () => {
    await answered(apiClient.enableTutorial());
    for (const key of TUTORIAL_CONTENT.map((quest) => quest.key)) {
      // oxlint-disable-next-line no-await-in-loop
      await answered(apiClient.startTutorialQuest(key));
      // oxlint-disable-next-line no-await-in-loop
      await answered(apiClient.completeTutorialQuest(key, 'button'));
    }
    await openMe();

    expect(screen.getByText('모두 완료했어요')).toBeVisible();
    expect(findButton('진행하기')).toBeNull();
    expect(findButton('그만하기')).toBeNull();
  });
});
