/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { openBrowserAsync } from 'expo-web-browser';
import { pass, screen } from './support/app';
import { button, findButton } from './support/lists';
import { givePhone, ME, ON_CAMPUS, placeOf } from './support/main';
import { answered, startFresh } from './support/mocks';
import {
  completed,
  KWANJEONG_ROW,
  openAsFreshman,
  openSheet,
  pressAndWait,
  S_CARD_ROW,
  SHEET,
  SHUTTLE_ROW,
  START,
  started,
} from './support/tutorial';
import { apiClient } from '@/api/client';
import { TUTORIAL_SHEET_FLAGS } from '@/screens/main/tutorial/tutorial-sheet';

// A 새내기 튜토리얼 quest's sheet on the main screen, against the mocks (MainTutorialSheet, MainTutorialOk and
// MainTutorialNext): its content, completing a button quest, the 관정 quest's skip and 예약 부탁 (hidden until ticket
// 07), and 그만하기.

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
  it('shows the dots, the title, the paragraphs, the 완료 조건, the places and the links', async () => {
    await openSheet('s-card', S_CARD_ROW);

    expect(screen.getByRole('header', { name: '학생증(S-CARD) 발급받기' })).toBeVisible();
    expect(screen.getByText('학생증(S-CARD)은 도서관 출입처럼 학교생활 곳곳에서 써요.')).toBeVisible();
    expect(screen.getByText('· 신청: MySNU에서 온라인으로 신청해요.')).toBeVisible();
    expect(screen.getByText('완료 조건')).toBeVisible();
    expect(screen.getByText('학생증 받기')).toBeVisible();
    expect(button('NH농협두레문예관 2층 지도에서 보기')).toBeVisible();
    expect(button('우리은행 (4동) 지도에서 보기')).toBeVisible();
    expect(button('MySNU 열기')).toBeVisible();
    expect(button('학생처 S-CARD 발급 절차 열기')).toBeVisible();
    expect(button('나중에')).toBeVisible();
    expect(button('완료했어요')).toBeVisible();
  });

  it('opens a link in the browser', async () => {
    const user = await openSheet('s-card', S_CARD_ROW);

    await user.press(button('MySNU 열기'));

    expect(openBrowserAsync).toHaveBeenCalledWith('https://my.snu.ac.kr');
  });

  it('brings the main map to a place and closes', async () => {
    const user = await openSheet('admin-shuttle', SHUTTLE_ROW);
    const before = placeOf(ME);

    await user.press(button('행정관 셔틀 정류장 (행정관 잔디광장 아래) 지도에서 보기'));
    await pass(1000);

    expect(screen.queryByLabelText(SHEET)).toBeNull();
    expect(placeOf(ME)).not.toEqual(before);
  });

  it('closes with 나중에 and keeps the quest started', async () => {
    const user = await openSheet('s-card', S_CARD_ROW);

    await user.press(button('나중에'));
    await pass(500);

    expect(screen.queryByLabelText(SHEET)).toBeNull();
    expect(button(S_CARD_ROW)).toBeVisible();
  });
});

describe('completing a button quest', () => {
  it('shows its message, then 퀘스트 완료 completes it and opens the pager on the next quest not started', async () => {
    await started('s-card');
    const user = await openAsFreshman();
    await user.press(button(S_CARD_ROW));
    await pass(500);

    await user.press(button('완료했어요'));

    expect(screen.getByText('학생증을 받았군요! 이제 도서관과 학교 시설을 마음껏 이용해 보세요.')).toBeVisible();
    expect((await answered(apiClient.getTutorial())).quests[0]?.status).toBe('started');

    await pressAndWait(user, '퀘스트 완료');

    expect(screen.getByText('퀘스트 완료! 다음 퀘스트 · 2/5')).toBeVisible();
    expect(screen.getByRole('header', { name: '행정관 셔틀 이용하기' })).toBeVisible();
    expect(button('퀘스트 시작')).toBeVisible();
    expect((await answered(apiClient.getTutorial())).quests[0]?.status).toBe('completed');
    await user.press(button('닫기'));
    expect(findButton(S_CARD_ROW)).toBeNull();
  });

  it('says all is done after the last quest, and the tutorial leaves the main screen', async () => {
    await completed('s-card', 'admin-shuttle', 'kwanjeong', 'health-clinic');
    await started('art-museum');
    const user = await openAsFreshman();
    await user.press(
      button('새내기 튜토리얼 · 5/5 · 서울대 미술관/파워플랜트 관람 · 완료 조건 · 미술관이나 파워플랜트 전시 관람하기'),
    );
    await pass(500);

    await user.press(button('완료했어요'));
    await pressAndWait(user, '퀘스트 완료');

    expect(screen.getByText('새내기 튜토리얼 완료')).toBeVisible();
    expect(screen.getByRole('header', { name: '튜토리얼을 모두 마쳤어요' })).toBeVisible();
    expect(screen.getByText('이제 SNU Now를 자유롭게 써 보세요.')).toBeVisible();
    await user.press(button('닫기'));
    expect(findButton(START)).toBeNull();
    expect(screen.queryAllByRole('button', { name: /새내기 튜토리얼 · /u })).toEqual([]);
    expect((await answered(apiClient.getTutorial())).state).toBe('finished');
  });
});

describe('the 관정 quest', () => {
  it('offers 나중에 and the skip, and no 완료했어요 before its check', async () => {
    await openSheet('kwanjeong', KWANJEONG_ROW);

    expect(button('나중에')).toBeVisible();
    expect(findButton('어시스턴트에게 예약 부탁하기')).toBeNull();
    expect(button('이미 예약 및 이용해본 적이 있어요')).toBeVisible();
    expect(findButton('완료했어요')).toBeNull();
    expect(button('중앙도서관 관정관 지도에서 보기')).toBeVisible();
  });

  it('completes at once with the skip and shows its message, then goes to the next quest', async () => {
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await pressAndWait(user, '이미 예약 및 이용해본 적이 있어요');

    expect(screen.getByText('관정도서관 이용은 어떠셨나요? 도서관을 자주 이용해 보아요!')).toBeVisible();
    expect((await answered(apiClient.getTutorial())).quests[2]?.status).toBe('completed');
    await pressAndWait(user, '퀘스트 완료');
    expect(screen.getByText('퀘스트 완료! 다음 퀘스트 · 4/5')).toBeVisible();
  });

  it('asks the Assistant for a seat once ticket 07 turns it on: the sheet closes and the chat opens with the words sent', async () => {
    jest.replaceProperty(TUTORIAL_SHEET_FLAGS, 'askAssistantToBook', true);
    const user = await openSheet('kwanjeong', KWANJEONG_ROW);

    await user.press(button('어시스턴트에게 예약 부탁하기'));
    await pass(1000);

    expect(screen.queryByLabelText(SHEET)).toBeNull();
    expect(screen.getByTestId('chat-sheet')).toBeVisible();
    expect(screen.getByText('관정도서관 7층 열람실에 한 자리 예약해줘')).toBeVisible();
  });
});

describe('튜토리얼 그만하기', () => {
  it('ends the tutorial on the main screen and keeps the progress', async () => {
    await started('s-card');
    const user = await openAsFreshman();
    await pressAndWait(user, START);

    await pressAndWait(user, '튜토리얼 그만하기');

    expect(screen.queryByText('새내기 튜토리얼 2/5')).toBeNull();
    expect(findButton(START)).toBeNull();
    expect(findButton(S_CARD_ROW)).toBeNull();
    const tutorial = await answered(apiClient.getTutorial());
    expect(tutorial.state).toBe('stopped');
    expect(tutorial.quests[0]?.status).toBe('started');
  });
});
