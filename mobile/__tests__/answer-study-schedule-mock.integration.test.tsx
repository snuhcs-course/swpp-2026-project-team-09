/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { STUDY_PLAN_ASKED } from '@/api/mock/data/study-plan-answer';
import { pass, screen } from './support/app';
import { card } from './support/answer-map';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// "일정에 넣기" on a study place over the mocks (P10 ticket 19): the study answer alone's first place, 공대
// 신양학술정보관, saved as a Quest taken alone as a meal's is (the main server's P10 ticket 24), and the card's two lines.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

function beside(): ReturnType<typeof within> {
  return within(screen.getByTestId('ai-input-beside'));
}

// Expected values: the stored study answer and the mock's Quest taken alone.
describe('"일정에 넣기" on a study place over the mocks', () => {
  it('saves the place as a Quest taken alone and says where the User goes', async () => {
    givePhone({ permission: 'refused', position: ON_CAMPUS });
    const user = await openMain();
    await pass(500);
    await user.type(screen.getByLabelText(AI_INPUT), STUDY_PLAN_ASKED);
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(3000);

    await user.press(beside().getByRole('button', { name: '일정에 넣기' }));
    await pass(1000);

    expect(card().getByText('공대 신양학술정보관으로 가요')).toBeVisible();
  });
});
