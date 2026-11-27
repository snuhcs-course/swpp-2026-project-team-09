/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { StyleSheet, type ViewStyle } from 'react-native';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { stepsReplyOn } from '@/api/mock/data/steps-answer';
import { space } from '@/design-system';
import { markLibraryLoggedIn } from '@/library/flag';
import { TAB } from '@/screens/main/answer/top-stops';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { lowerCard, raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { sendFromBar, startLibraryChat } from './support/library-chat';
import { hideKeyboard } from './support/keyboard';
import { layStage } from './support/lists';
import { openMain } from './support/main';
import { stepGrip } from './support/time-card';

// The top of an answer to several requests folds upward in three stops (P01 ticket 22, the user's choice of
// 2026-11-27): 2, the steps card with the time card under it; 1, the steps card with a tab under its bottom centre and
// the time card wholly behind it; 0, one tab at the top's centre. The fault it removes: the folded time card's end
// showing above the steps card. The reply is "17시 반에 관정 갔다가 19시쯤 저녁 먹을래": ① a seat, ② a dinner Plan.
// Expected values: the steps card laid out 120 high; the tab 24; the gap under the top 8.

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

const STEPS_CARD = 120;

let server: FakeServer;

beforeEach(async () => {
  ({ server } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The reply to several requests on screen, its dinner (②) shown and its steps card laid out.
async function atDinner(): Promise<void> {
  await markLibraryLoggedIn();
  server.on('POST /assistant/messages', { status: 200, body: stepsReplyOn('2026-11-02') });
  const user = await openMain();
  await layStage(390, 760);
  await sendFromBar(user, '17시 반에 관정 갔다가 19시쯤 저녁 먹을래');
  await hideKeyboard();
  await user.press(screen.getByRole('button', { name: /^2번/u }));
  await pass(50);
  await layStepsCard();
}

async function layStepsCard(): Promise<void> {
  const [steps] = screen.getAllByTestId('time-bar');
  if (steps !== undefined) {
    await fireEvent(steps, 'layout', { nativeEvent: { layout: { x: 16, y: 8, width: 358, height: STEPS_CARD } } });
    await pass(50);
  }
}

// The cards at the top: the steps card and, under it, the time card, both named `time-bar`.
const cards = (): number => screen.queryAllByTestId('time-bar').length;

async function pull(tab: string, dy: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(`${tab}-drag`), [
      { translationY: 0 },
      { translationY: dy / 2 },
      { translationY: dy },
    ]);
  });
  await pass(50);
}

async function press(tab: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(tab));
  await pass(50);
}

// High's height: the sheet's scrolling part is laid out at it.
function highHeight(): number {
  const style: unknown = screen.getByTestId('answer-card-content').props.style;
  return Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).height);
}

// Partitions: folding the time card by its grip; the stops in order, folding and opening; a press, a pull, a long pull.
describe('the top of several requests', () => {
  it('folds the time card wholly behind the steps card, with a tab under it and nothing above it', async () => {
    await atDinner();
    expect(cards()).toBe(2);

    await stepGrip('tuck');
    await pass(50);

    expect(cards()).toBe(1);
    expect(screen.getByTestId('steps-tab')).toBeVisible();
    expect(screen.queryByTestId('time-card-grip')).toBeNull();
  });

  it('folds the steps card too from its tab, leaving one tab at the top, and opens in the reverse order', async () => {
    await atDinner();
    await stepGrip('tuck');
    await pass(50);

    await pull('steps-tab', -40);
    expect(cards()).toBe(0);
    expect(screen.getByTestId('top-tab')).toBeVisible();

    await press('top-tab');
    expect(cards()).toBe(1);
    expect(screen.getByTestId('steps-tab')).toBeVisible();

    await press('steps-tab');
    expect(cards()).toBe(2);
    expect(screen.queryByTestId('steps-tab')).toBeNull();
  });

  it('opens two stops at once by a long pull down on the top tab', async () => {
    await atDinner();
    await stepGrip('tuck');
    await pass(50);
    await pull('steps-tab', -40);

    await pull('top-tab', 160);

    expect(cards()).toBe(2);
  });
});

// Partitions: a step with no time card (the seat, ①).
describe('a seat step at the top', () => {
  it('shows its steps card with the tab, which folds to the top tab and opens nothing downward', async () => {
    await atDinner();
    await fireEvent.press(screen.getByRole('button', { name: /^1번/u }));
    await pass(50);

    expect(cards()).toBe(1);
    await press('steps-tab');
    expect(cards()).toBe(1);
    await pull('steps-tab', 160);
    expect(cards()).toBe(1);
    expect(screen.getByTestId('steps-tab')).toBeVisible();

    await pull('steps-tab', -40);
    expect(screen.getByTestId('top-tab')).toBeVisible();
  });
});

// Partitions: the sheet's high at each stop; the sheet rising to high from stop 2. Expected values: at 2 high stands
// under the steps card and the Plan's bar, 120 + 8 (the Plan's bar not laid out here); at 1 under the steps card and its
// tab, 120 + 24; at 0 under the tab alone.
describe("the answer sheet's high at each stop", () => {
  it('stands under what is left at the top', async () => {
    await atDinner();
    const atTwo = highHeight();

    await stepGrip('tuck');
    await pass(50);
    const atOne = highHeight();
    await pull('steps-tab', -40);
    const atZero = highHeight();

    expect(atOne).toBe(atTwo - (STEPS_CARD + TAB.height - (STEPS_CARD + space[2])));
    expect(atZero).toBe(atTwo + (STEPS_CARD + space[2] - TAB.height));
  });

  it('folds the time card behind the steps card when the sheet rises to high, and leaves it folded when it lowers', async () => {
    await atDinner();

    await raiseCard();
    await raiseCard();
    await pass(50);

    expect(cards()).toBe(1);
    expect(screen.getByTestId('steps-tab')).toBeVisible();

    await lowerCard();
    await pass(50);
    expect(cards()).toBe(1);
  });
});

// The reply to one request on screen, its time card laid out.
async function atMeal(): Promise<void> {
  server.on('POST /assistant/messages', { status: 200, body: MEAL_ANSWER_REPLY });
  const user = await openMain();
  await layStage(390, 760);
  await sendFromBar(user, '배고파');
  await hideKeyboard();
  await pass(50);
}

// An answer to one request has no steps card: its stops are 2, the time card, and 0, the tab at the top's centre, the
// one folded look for every answer kind (it replaces the tucked strip). The sheet rising to high leaves it as it stands.
describe('the top of one request', () => {
  it('folds the time card to the tab at the top, and the tab brings it back', async () => {
    await atMeal();
    expect(cards()).toBe(1);

    await stepGrip('tuck');
    await pass(50);
    expect(cards()).toBe(0);
    expect(screen.getByTestId('top-tab')).toBeVisible();

    await press('top-tab');
    expect(cards()).toBe(1);
  });

  it('stays as it stands when the sheet rises to high', async () => {
    await atMeal();

    await raiseCard();
    await raiseCard();
    await pass(50);

    expect(cards()).toBe(1);
    expect(screen.queryByTestId('top-tab')).toBeNull();
  });
});
