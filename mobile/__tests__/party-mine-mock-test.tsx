/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen, shownAddress } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';

// 내 파티 against the mocks, at the `Main` frame's moment, Thursday 1 October 2026 at 13:37 in Korea: the mocked past
// Quests and the invitations waiting on the User's own 비공개 파티.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

function headers(): string[] {
  return screen.getAllByRole('header').map(({ props }) => String(props.children));
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('내 파티 in the mock build', () => {
  it('lists the past Quests last under 지난 일정, the latest first, without a room to open', async () => {
    const user = await openAt('/party?tab=mine');
    await pass(500);

    expect(headers().at(-1)).toBe('지난 일정');
    expect(
      screen.getAllByText(/^(자료구조 중간고사 스터디|버들골 저녁 러닝)$/u).map(({ props }) => String(props.children)),
    ).toEqual(['자료구조 중간고사 스터디', '버들골 저녁 러닝']);
    const study = within(screen.getByLabelText('자료구조 중간고사 스터디'));
    expect(study.getByText('비공개 파티')).toBeVisible();
    expect(study.getByText('멤버 3명')).toBeVisible();
    expect(study.getByText('9월 28일 (월) 19:00')).toBeVisible();
    expect(study.getByText('나, 정하은 외 1명')).toBeVisible();
    expect(screen.queryByRole('button', { name: '자료구조 중간고사 스터디' })).toBeNull();
    // The chips count the Quests held now: the Party of the career talk and the dinner.
    expect(screen.getByText('전체 2')).toBeVisible();

    await user.press(screen.getByLabelText('자료구조 중간고사 스터디'));
    expect(shownAddress()).toBe('/party?tab=mine');
  });

  it('counts the invitation still waiting on the 비공개 파티 the User leads', async () => {
    await openAt('/party?tab=mine');
    await pass(500);

    const dinner = within(screen.getByRole('button', { name: '저녁 약속' }));
    expect(dinner.getByText('2명 · 초대 1명 대기')).toBeVisible();
  });
});
