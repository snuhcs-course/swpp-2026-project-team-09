/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { openBrowserAsync } from 'expo-web-browser';
import { pass, screen } from './support/app';
import { AI_INPUT, button, findButton } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { FRIEND } from './support/markers';
import { answered, startFresh } from './support/mocks';
import { LIST, openGuide, pressAndWait, SHEET, TO_LIST } from './support/tutorial';
import { apiClient } from '@/api/client';
import { MOCK_TUTORIAL_SWITCHES } from '@/api/mock/tutorial';

// A 새내기 튜토리얼 quest's guide on the map, against the mocks (the canvas's MainTutorialCard1–6, MainTutorialMeal and
// MainTut* boards, P15 ticket 53): the bar, the bubble's words, the steps, the kinds of the 학생증, the spots of 상담,
// ✓ 완료, and what gives way while a guide is open.

const STEP_PIN = 'tutorialStep';

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

function tab(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('tab', { name });
}

describe('the 학생증 guide', () => {
  it('asks for the kind first, with both places and the main button off', async () => {
    await openGuide('s-card');

    expect(button('일반 학생증')).toBeVisible();
    expect(button('금융 학생증 (체크카드)')).toBeVisible();
    expect(screen.getByText('MySNU')).toBeVisible();
    expect(screen.getAllByText('학생지원센터').length).toBeGreaterThan(0);
    expect(button('종류를 골라 주세요')).toBeDisabled();
    expect(screen.queryAllByTestId(STEP_PIN)).toHaveLength(2);
  });

  it("walks 일반's steps with 다음 and the tabs, and ends on ✓ 완료", async () => {
    const user = await openGuide('s-card');

    await user.press(button('일반 학생증'));

    expect(screen.getByText('온라인 신청')).toBeVisible();
    expect(screen.getByText('S-CARD 분실신고')).toBeVisible();
    expect(screen.getByText('여기서 신청')).toBeVisible();
    expect(button('일반 · 종류 다시 고르기')).toBeVisible();
    await user.press(button('MySNU (외부 사이트)'));
    expect(openBrowserAsync).toHaveBeenCalledWith('https://my.snu.ac.kr');

    await user.press(button('다음'));
    expect(screen.getByText('방문 수령')).toBeVisible();
    expect(screen.getByText('67동 · 두레문예관 2층')).toBeVisible();
    expect(screen.getByText('신청 다음 날부터')).toBeVisible();
    expect(button('길찾기')).toBeVisible();

    await user.press(tab('모바일'));
    expect(screen.getByText('모바일 학생증')).toBeVisible();
    expect(screen.getByText('선택')).toBeVisible();
    expect(button('완료')).toBeEnabled();
  });

  it('chooses again from the kind chip, and ← on the first step goes back to the choice', async () => {
    const user = await openGuide('s-card');
    await user.press(button('금융 학생증 (체크카드)'));
    expect(screen.getByText('은행에서 발급')).toBeVisible();

    await user.press(button('이전'));
    expect(button('일반 학생증')).toBeVisible();

    await user.press(button('금융 학생증 (체크카드)'));
    await user.press(button('금융 · 종류 다시 고르기'));
    expect(button('종류를 골라 주세요')).toBeDisabled();
  });
});

describe('a guide of places side by side', () => {
  it("shows 상담's tabs without numbers, and a spot's facts once pressed", async () => {
    const user = await openGuide('counseling-center');

    expect(['마음', '인권', '단과대', '생활 지원'].map((name) => tab(name))).toHaveLength(4);
    expect(screen.getByText('SNU Call 02-880-8080 · 24시간')).toBeVisible();
    expect(findButton('이전')).toBeNull();
    expect(button('완료')).toBeEnabled();

    await user.press(tab('단과대'));
    await user.press(button('경청'));

    expect(screen.getByText('58동 210호')).toBeVisible();
    expect(screen.getByText('무료')).toBeVisible();
    expect(button('길찾기')).toBeVisible();
  });

  it("shows the 천원의 식사 board's words", async () => {
    const user = await openGuide('thousand-won-meals');

    expect(screen.getByText(/천원의 식사는 재학생이 부담 없이/u)).toBeVisible();
    expect(screen.getByText('아침 · 점심 · 저녁')).toBeVisible();
    await user.press(tab('윗공대'));
    expect(screen.getByText('아침만')).toBeVisible();
  });
});

describe('a guide on the map', () => {
  it('takes the whole map: the lists, the input and the people give way', async () => {
    await openGuide('lost-and-found');

    expect(screen.queryByLabelText(AI_INPUT)).toBeNull();
    expect(screen.queryByTestId('quest-list')).toBeNull();
    expect(findButton(FRIEND)).toBeNull();
    expect(screen.queryAllByTestId(STEP_PIN)).toHaveLength(1);
  });

  it('goes back to the list with ←, and closes with ✕', async () => {
    const user = await openGuide('lost-and-found');

    await user.press(button(TO_LIST));
    expect(screen.getByLabelText(LIST)).toBeVisible();

    await pressAndWait(user, '분실물센터 위치 알아두기 · 진행 중');
    await user.press(button('닫기'));
    expect(findButton(TO_LIST)).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
  });

  it('closes and asks the Assistant with 어시스턴트에게 부탁', async () => {
    const user = await openGuide('kwanjeong');

    await user.press(button('어시스턴트에게 부탁'));
    await pass(1000);

    expect(findButton(TO_LIST)).toBeNull();
    expect(screen.getByText('관정도서관 7층 열람실에 한 자리 예약해줘')).toBeVisible();
  });

  it("gives way to the sheet's check for the 관정 quest served as checked", async () => {
    MOCK_TUTORIAL_SWITCHES.kwanjeongCheck = true;
    try {
      const user = await openGuide('kwanjeong');
      await user.press(tab('반납'));

      await user.press(button('완료'));
      await pass(500);

      expect(screen.getByLabelText(SHEET)).toBeVisible();
      expect((await answered(apiClient.getTutorial())).quests[4]?.status).toBe('started');
    } finally {
      MOCK_TUTORIAL_SWITCHES.kwanjeongCheck = false;
    }
  });
});
