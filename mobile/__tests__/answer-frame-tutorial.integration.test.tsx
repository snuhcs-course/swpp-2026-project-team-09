/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { AI_INPUT, button } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { openListAt, pressAndWait, rowName, SHEET, START, started, type User } from './support/tutorial';
import { MOCK_TUTORIAL_SWITCHES } from '@/api/mock/tutorial';

// The answer frame and the 새내기 튜토리얼 (P02 ticket 01, "What gives way" and "Every way of asking"), against the
// mocks: the tutorial's start button gives way to the frame, and the tutorial's ask shows it.

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

// A 26학번 User, whom the tutorial is for.
function openFreshmanFramed(): Promise<User> {
  return openMain({
    answers: {
      name: '홍길동',
      department: '컴퓨터공학부',
      admissionYear: 2026,
      hashtags: [],
      gender: null,
    },
  });
}

function closeButton(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name: '답 닫기' });
}

// Partitions: the start button before asking, while the frame is shown, and after ✕.
describe("the tutorial's start button and the frame", () => {
  it('gives way while the frame is shown, and comes back after ✕', async () => {
    await started('s-card');
    const user = await openFreshmanFramed();
    expect(button(START)).toBeVisible();

    await user.type(screen.getByLabelText(AI_INPUT), '배고파');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(1000);
    expect(screen.queryByRole('button', { name: START })).toBeNull();

    await user.press(closeButton());
    expect(button(START)).toBeVisible();
  });
});

// Partitions: the 관정 quest's ask.
describe("the tutorial's ask", () => {
  it('closes the sheet and shows the frame with the words in the pill, and no chat sheet', async () => {
    MOCK_TUTORIAL_SWITCHES.guides = false;
    await started('kwanjeong');
    const user = await openFreshmanFramed();
    await openListAt(user, 'kwanjeong');
    await pressAndWait(user, rowName('kwanjeong', ' · 진행 중'));

    await user.press(button('어시스턴트에게 예약 부탁하기'));
    await pass(1000);

    expect(screen.queryByLabelText(SHEET)).toBeNull();
    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(
      within(screen.getByTestId('answer-caption')).getByText('관정도서관 7층 열람실에 한 자리 예약해줘'),
    ).toBeVisible();
  });
});
