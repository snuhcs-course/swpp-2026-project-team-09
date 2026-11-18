/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { openBrowserAsync } from 'expo-web-browser';
import { pass, screen } from './support/app';
import { button, findButton } from './support/lists';
import { givePhone, ME, ON_CAMPUS, placeOf } from './support/main';
import { answered, startFresh } from './support/mocks';
import {
  completed,
  LIST,
  openSheet,
  pressAndWait,
  QUEST_KEYS,
  rowName,
  SHEET,
  START,
  started,
} from './support/tutorial';
import { within } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { MOCK_TUTORIAL_SWITCHES } from '@/api/mock/tutorial';

// A 새내기 튜토리얼 quest's sheet on the main screen, for a quest without a guide (an older main server's), against the
// mocks (MainTutorialSheet, MainTutorialOk and MainTutorialNext): its content, completing a button quest, the 관정
// quest served as a button quest (its check off, P13) with 예약 부탁 and no skip, and 그만하기. The 관정 check itself is
// `tutorial-kwanjeong-check.integration.test.tsx`'s.

jest.mock('expo-location');
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })) }));
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
  jest.mocked(openBrowserAsync).mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("a quest's sheet", () => {
  it('shows the dots, 🌐, the title, the paragraphs, the places and the links, and no 완료 조건', async () => {
    await openSheet('s-card');

    expect(within(screen.getByLabelText(SHEET)).getByText('새내기 튜토리얼 · 생활 · 1/15')).toBeVisible();
    expect(button('외부 사이트 링크')).toBeVisible();
    expect(screen.getByRole('header', { name: '학생증(S-CARD) 발급받기' })).toBeVisible();
    expect(screen.getByText('학생증(S-CARD)은 도서관 출입처럼 학교생활 곳곳에서 써요.')).toBeVisible();
    expect(screen.getByText('· 신청: MySNU에서 온라인으로 신청해요.')).toBeVisible();
    expect(screen.queryByText('완료 조건')).toBeNull();
    expect(button('NH농협두레문예관 2층 지도에서 보기')).toBeVisible();
    expect(button('우리은행 (4동) 지도에서 보기')).toBeVisible();
    expect(button('MySNU 열기')).toBeVisible();
    expect(button('학생처 S-CARD 발급 절차 열기')).toBeVisible();
    expect(button('나중에')).toBeVisible();
    expect(button('완료')).toBeVisible();
    expect(findButton('어시스턴트에게 예약 부탁하기')).toBeNull();
  });

  it('opens a link in the browser, from the list and from 🌐', async () => {
    const user = await openSheet('s-card');

    await user.press(button('MySNU 열기'));
    expect(openBrowserAsync).toHaveBeenCalledWith('https://my.snu.ac.kr');

    await user.press(button('외부 사이트 링크'));
    await user.press(screen.getByRole('link', { name: '학생처 S-CARD 발급 절차 열기 (외부 사이트)' }));
    expect(openBrowserAsync).toHaveBeenLastCalledWith(expect.stringContaining('student.snu.ac.kr'));
  });
});

describe("a quest's sheet, pressed", () => {
  it('brings the main map to a place and closes', async () => {
    const user = await openSheet('admin-shuttle');
    const before = placeOf(ME);

    await user.press(button('행정관 셔틀 정류장 (행정관 잔디광장 아래) 지도에서 보기'));
    await pass(1000);

    expect(screen.queryByLabelText(SHEET)).toBeNull();
    expect(placeOf(ME)).not.toEqual(before);
  });

  it('closes with 나중에 and keeps the quest started', async () => {
    const user = await openSheet('s-card');

    await user.press(button('나중에'));
    await pass(500);

    expect(screen.queryByLabelText(SHEET)).toBeNull();
    expect((await answered(apiClient.getTutorial())).quests[0]?.status).toBe('started');
  });

  it("shows the 천원의 식사 board's two lines and its two places", async () => {
    await openSheet('thousand-won-meals');

    expect(screen.getByText('아침·점심·저녁, 1,000원에 먹을 수 있어요.')).toBeVisible();
    expect(screen.getByText('윗공대(301동)는 아침만 운영해요.')).toBeVisible();
    expect(button('윗공대 301동 · 아침만 지도에서 보기')).toBeVisible();
  });
});

describe('completing a button quest', () => {
  it('shows its message, then 퀘스트 완료 completes it and opens the list on the next quest', async () => {
    const user = await openSheet('s-card');

    await user.press(button('완료'));

    expect(screen.getByText('학생증을 받았군요! 이제 도서관과 학교 시설을 마음껏 이용해 보세요.')).toBeVisible();
    expect((await answered(apiClient.getTutorial())).quests[0]?.status).toBe('started');

    await pressAndWait(user, '퀘스트 완료');

    expect(screen.getByLabelText(LIST)).toBeVisible();
    // The banner over the list, and the row.
    expect(screen.getAllByText('학생증(S-CARD) 발급받기')).toHaveLength(2);
    expect(screen.getByText('다음')).toBeVisible();
    expect(button(rowName('s-card', ' · 완료'))).toBeVisible();
    expect((await answered(apiClient.getTutorial())).quests[0]?.status).toBe('completed');
  });

  it('shows n / n after the last quest, and the tutorial leaves the main screen', async () => {
    await completed(...QUEST_KEYS.filter((key) => key !== 'art-museum'));
    const user = await openSheet('art-museum');

    await user.press(button('완료'));
    await pressAndWait(user, '퀘스트 완료');

    expect(screen.getByRole('header', { name: '15 / 15' })).toBeVisible();
    await user.press(button('닫기'));
    expect(findButton(START)).toBeNull();
    expect((await answered(apiClient.getTutorial())).state).toBe('finished');
  });
});

describe('the 관정 quest, served as a button quest', () => {
  it('offers 나중에, ✓ 완료 and 어시스턴트에게 예약 부탁하기, and no skip', async () => {
    await openSheet('kwanjeong');

    expect(button('나중에')).toBeVisible();
    expect(button('완료')).toBeVisible();
    expect(button('어시스턴트에게 예약 부탁하기')).toBeVisible();
    expect(findButton('이미 예약 및 이용해본 적이 있어요')).toBeNull();
    expect(button('중앙도서관 관정관 지도에서 보기')).toBeVisible();
  });

  it('completes by ✓ 완료 with its message, without a check, then goes to the next quest', async () => {
    const user = await openSheet('kwanjeong');

    await user.press(button('완료'));

    expect(screen.getByText('관정도서관 이용은 어떠셨나요? 도서관을 자주 이용해 보아요!')).toBeVisible();
    await pressAndWait(user, '퀘스트 완료');
    expect((await answered(apiClient.getTutorial())).quests[4]?.status).toBe('completed');
    expect(screen.getAllByText('관정도서관 예약하기')).toHaveLength(2);
    expect(button(rowName('su-grading-option'))).toBeVisible();
  });
});

describe('튜토리얼 그만하기', () => {
  it('ends the tutorial on the main screen and keeps the progress', async () => {
    MOCK_TUTORIAL_SWITCHES.guides = false;
    await started('s-card');
    const user = await openSheet('thousand-won-meals');
    await user.press(button('나중에'));
    await pressAndWait(user, START);

    await pressAndWait(user, '튜토리얼 그만하기');

    expect(screen.queryByLabelText(LIST)).toBeNull();
    expect(findButton(START)).toBeNull();
    const tutorial = await answered(apiClient.getTutorial());
    expect(tutorial.state).toBe('stopped');
    expect(tutorial.quests[0]?.status).toBe('started');
  });
});
