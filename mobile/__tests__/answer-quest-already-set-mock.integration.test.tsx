/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// P04 ticket 17 over the mocks, as the mock build shows it: a lunch made from 배고파's Plan, then 배고파 again, which
// the mock answers beside that lunch as the main server does. Without the location permission the mock's Plan is the
// User's alone (일정에 넣기); with it, the Plan is with 민수 (만들고 초대 보내기), a shared lunch.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

type User = Awaited<ReturnType<typeof openMain>>;

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

async function say(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(3000);
}

// Partitions: a lunch held alone, and one shared with 민수.
describe('배고파 again over the mocks, beside a lunch made from its Plan', () => {
  it('says the lunch held alone is set, with 바꾸기', async () => {
    givePhone({ permission: 'denied', position: ON_CAMPUS });
    const user = await openMain();
    await pass(500);
    await say(user, '배고파');
    await user.press(beside().getByRole('button', { name: '일정에 넣기' }));
    await pass(1000);

    await say(user, '배고파');

    expect(screen.getByText('이미 11:50 301동식당 점심이 있어요. 바꿀까요?')).toBeVisible();
    expect(beside().getByRole('button', { name: '바꾸기' })).toBeEnabled();
  });

  it('says the lunch with 민수 is changed in its 파티, with 파티 보기', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    const user = await openMain();
    await pass(500);
    await say(user, '배고파');
    await user.press(beside().getByRole('button', { name: '만들고 초대 보내기' }));
    await pass(1000);

    await say(user, '배고파');

    expect(
      screen.getByText('이미 민수와 12:15 302동식당 점심이 있어요. 바꾸려면 그 파티에서 바꿔 주세요.'),
    ).toBeVisible();
    expect(beside().getByRole('button', { name: '파티 보기' })).toBeEnabled();
  });
});
