/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { apiClient } from '@/api/client';
import { pass, screen } from './support/app';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';

// The candidates of 학관 as chips, against the mocks, where the app asks no main server.

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

describe('the mock Assistant asked about 학관', () => {
  it('asks which Place with the three as chips, and proposes lunch at the one pressed', async () => {
    const asking = jest.spyOn(apiClient, 'askAssistant');
    const user = await openMain();
    await user.press(screen.getByLabelText(AI_INPUT));
    await user.type(screen.getByLabelText(AI_INPUT), '학관에서 내일 점심 모집해줘');
    await press(user, '보내기');
    await pass(300);

    const chips = within(screen.getByTestId('choices-place')).getAllByRole('button');
    expect(chips.map((chip) => String(chip.props.accessibilityLabel))).toEqual([
      '학생회관',
      '(관악사)학부 생활관',
      '유회진 학술정보관',
    ]);

    await press(user, '학생회관');
    await pass(300);

    expect(asking.mock.lastCall?.[0].at(-1)).toEqual({
      role: 'user',
      text: '학생회관',
      chosen: { kind: 'place', id: 'place-63', words: '학관' },
    });
    expect(within(screen.getByTestId('proposal-card')).getByLabelText('어디서 학생회관')).toBeVisible();
    expect(screen.queryByTestId('choices-place')).toBeNull();
  });
});
