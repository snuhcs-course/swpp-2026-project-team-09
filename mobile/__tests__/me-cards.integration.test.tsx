/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// 내 정보's cards that end with a row, against the mocks (P06 ticket 09): the card's edge ends them, so their last row
// draws no line, and 관정도서관 로그인's button stands level with the book.

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

async function openMe(): Promise<void> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
}

describe("내 정보's cards", () => {
  it('draw no line under 관심사, 탭 안내 다시 보기 and 관정도서관 로그인, and the lines between the activity rows stay', async () => {
    await openMe();

    for (const name of ['친구 관리 12', '참여 중인 파티 2', '내 퀘스트']) {
      expect(screen.getByRole('button', { name })).toHaveStyle({ borderBottomWidth: 1 });
    }
    expect(screen.getByRole('button', { name: /^관심사/u })).not.toHaveStyle({ borderBottomWidth: 1 });
    expect(screen.getByRole('button', { name: '탭 안내 다시 보기' })).not.toHaveStyle({ borderBottomWidth: 1 });
    expect(screen.getByRole('button', { name: '로그인' }).parent).not.toHaveStyle({ borderBottomWidth: 1 });
  });

  it("stand 관정도서관 로그인's button in the row's middle, level with the book", async () => {
    await openMe();

    expect(screen.getByRole('button', { name: '로그인' })).toHaveStyle({ alignSelf: 'center' });
  });
});
