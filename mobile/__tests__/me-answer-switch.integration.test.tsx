/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { setAnswerSwitch } from '@/features/assistant/answer-switch';
import { readKeptAfterChanges } from '@/storage/kept';
import { pass, screen } from './support/app';
import { AI_INPUT, FRIEND_PILL } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// The switch of the answer on the map on 내 정보 (P02 ticket 01, "The switch"), against the mocks: a long press on the
// build line at the bottom turns it on or off.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const TURNED_ON = '지도 위의 답을 켰어요';
const TURNED_OFF = '지도 위의 답을 껐어요';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function openMe(kept: Parameters<typeof openMain>[0] = {}): Promise<User> {
  const user = await openMain(kept);
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

async function holdBuildLine(user: User): Promise<void> {
  await user.longPress(screen.getByText(/^앱 /u));
  await pass(0);
}

// Sends words from the bar and waits for the reply.
async function ask(user: User, words = '배고파'): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(1000);
}

function toast(): ReturnType<typeof within> {
  return within(screen.getByTestId('toast-layer'));
}

// Partitions: the switch off, as a phone that kept nothing starts, and on; the main screen before and after a change.
describe('the switch of the answer on the map', () => {
  it('turns on with a long press on the build line, says so, and the phone keeps it', async () => {
    const user = await openMe();

    await holdBuildLine(user);

    expect(toast().getByText(TURNED_ON)).toBeVisible();
    expect((await readKeptAfterChanges()).answerOnMap).toBe(true);
  });

  it('turns off with a long press while it is on, says so, and the phone keeps it', async () => {
    const user = await openMe({ answerOnMap: true });

    await holdBuildLine(user);

    expect(toast().getByText(TURNED_OFF)).toBeVisible();
    expect((await readKeptAfterChanges()).answerOnMap).toBe(false);
  });

  it('adds nothing visible to 내 정보', async () => {
    await openMe();

    expect(screen.queryByText(/지도 위의 답/u)).toBeNull();
  });

  it('is followed by the main screen without a restart: the words sent from the bar stand in the pill', async () => {
    const user = await openMe();
    await holdBuildLine(user);

    await user.press(screen.getByRole('tab', { name: '지도' }));
    await user.press(screen.getByLabelText(AI_INPUT));
    await ask(user, '한식');

    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(within(screen.getByTestId('answer-pill')).getByText('한식')).toBeVisible();
  });
});

// Partitions: turned on with the chat sheet open and a conversation in it; turned off while the frame is shown.
describe('a change of the switch while a conversation exists', () => {
  it('closes the sheet and forgets the conversation when the switch is turned on', async () => {
    const user = await openMain();
    await user.press(screen.getByLabelText(AI_INPUT));
    await ask(user);
    expect(screen.getByTestId('chat-sheet')).toBeVisible();

    await user.press(screen.getByRole('tab', { name: '내 정보' }));
    await pass(500);
    await holdBuildLine(user);
    await user.press(screen.getByRole('tab', { name: '지도' }));

    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(screen.getByRole('button', { name: FRIEND_PILL })).toBeVisible();
  });

  it('closes the frame and forgets the conversation when the switch is turned off', async () => {
    const user = await openMain({ answerOnMap: true });
    await ask(user);
    expect(screen.getByTestId('answer-pill')).toBeVisible();

    // The tab bar gives way to the frame, so the switch is turned off as the build line's long press does it.
    await act(() => setAnswerSwitch(false));

    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(screen.getByRole('tab', { name: '내 정보' })).toBeVisible();
    expect(screen.getByRole('button', { name: FRIEND_PILL })).toBeVisible();
    await user.press(screen.getByLabelText(AI_INPUT));
    expect(screen.getByTestId('chat-empty')).toBeVisible();
  });
});
