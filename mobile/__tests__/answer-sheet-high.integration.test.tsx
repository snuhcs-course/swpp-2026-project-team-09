/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap } from './support/answer-map';
import { grip as sheetGrip, raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 63, the user's phone (2026-11-26): "내일 저녁이라고 전송하고 로딩하는 동안에는 높게를 하면 화면 전체를
// 덮기는 하네". High's top edge is one line for every answer and state, just under the place the folded time card
// takes, whether one stands there yet or not.

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

// The answer takes this long to come, by the test's clock.
const ANSWER_MS = 5000;

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

// High's height: the sheet's scrolling part is laid out at it.
function highHeight(): number {
  const style: unknown = screen.getByTestId('answer-card-content').props.style;
  return Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).height);
}

// Partitions: while the answer loads, with no time card yet; the answer come, its time card laid out as the phone lays
// it out. Expected value: the same high in both.
describe('high while an answer loads', () => {
  it('stands at the same line as under the time card that comes with the answer', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY, async () => {
      server.on('POST /assistant/messages', { status: 200, body: MEAL_ANSWER_REPLY, afterMs: ANSWER_MS });
      await pass(0);
    });
    await layStage(390, 760);
    expect(screen.queryByTestId('time-bar')).toBeNull();
    await raiseCard();
    await raiseCard();
    expect(sheetGrip()).toHaveAccessibilityValue({ text: '크게' });
    const loading = highHeight();

    await pass(ANSWER_MS);
    await fireEvent(screen.getByTestId('time-bar'), 'layout', {
      nativeEvent: { layout: { x: 16, y: 8, width: 358, height: 116 } },
    });
    await pass(50);

    expect(highHeight()).toBe(loading);
  });
});
