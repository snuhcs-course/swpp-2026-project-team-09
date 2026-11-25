/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, timeBar } from './support/answer-map';
import { grip as sheetGrip, lowerCard, raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { checkedRows, pickCancel, pickDone, pickRow } from './support/picking';
import { answerMainScreen, askMainServer, MIN_JUN, PHONE_NOW } from './support/server';

// People picked in the time card while the answer's sheet moves (P04 ticket 64, the user's rule of 2026-11-26): the
// card touched last wins and the other yields, and a yield is not undone by itself. The sheet raised to high folds the
// rows, the head with 취소 · 완료 staying; they stay folded when it comes back down, and the grip brings them back with
// the checks kept. Against the fake main server, over the stored answer to "배고파, 민수랑 같이".

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

const ADD = '같이 먹을 친구 추가';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function timeCard(): ReturnType<typeof screen.getByTestId> {
  return screen.getByTestId('time-card-grip');
}

// The sheet raised to high, where the rows fold and the head stays, then brought back to middle, where they stay
// folded.
async function highThenMiddle(): Promise<void> {
  await raiseCard();
  expect(sheetGrip()).toHaveAccessibilityValue({ text: '크게' });
  expect(timeCard()).toBeCollapsed();
  expect(pickCancel()).toBeVisible();
  expect(pickDone()).toBeVisible();

  await lowerCard();
  expect(sheetGrip()).toHaveAccessibilityValue({ text: '중간' });
  expect(timeCard()).toBeCollapsed();
}

// Partitions: the sheet raised to high and brought back to middle, twice, the grip opening the rows between; then
// lowered to low.
describe('the picking rows as the answer’s sheet moves', () => {
  it('fold while the sheet is high, stay folded when it comes back down, and open by the grip, the checks kept', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await layStage(390, 760);
    await user.press(timeBar().getByRole('button', { name: ADD }));
    await user.press(pickRow(MIN_JUN.name));
    await raiseCard();
    expect(timeCard()).toBeExpanded();

    await highThenMiddle();
    await user.press(timeCard());
    expect(timeCard()).toBeExpanded();
    await highThenMiddle();
    await lowerCard();

    expect(timeCard()).toBeCollapsed();
    await user.press(timeCard());
    expect(timeCard()).toBeExpanded();
    expect(checkedRows()).toHaveLength(2);
  });
});
