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
import { radius, space } from '@/design-system';
import { markLibraryLoggedIn } from '@/library/flag';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { lowerCard, raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { sendFromBar, startLibraryChat } from './support/library-chat';
import { hideKeyboard } from './support/keyboard';
import { layStage } from './support/lists';
import { openMain } from './support/main';
import { layFolded, stepGrip } from './support/time-card';

// The top of an answer to several requests folds upward in stops (P01 ticket 22, the user's choice of 2026-11-27,
// "이 안으로"): 2, the steps card with the time card under it; 1, the time card wholly behind the steps card with only
// its grip strip under the steps card's bottom edge; 0, the steps card gone up too, the one strip left at the stage's
// top. The strip is the time card itself stopped short. The fault it removes: the folded time card's end showing above
// the steps card. The reply is "17시 반에 관정 갔다가 19시쯤 저녁 먹을래": ① a seat, ② a dinner Plan. Expected values:
// the steps card laid out 120 high; the time card 100 folded; the gap between them 8; the strip 20; so behind the
// steps card the time card goes up 8 + 100 − 20 = 88.

type Found = ReturnType<typeof screen.getByTestId>;

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

const STEPS = 120;
const FOLDED = 100;
const STRIP = 20;
const BEHIND = space[2] + FOLDED - STRIP;

let server: FakeServer;

beforeEach(async () => {
  ({ server } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// The reply to several requests on screen, its dinner (②) shown and both cards laid out.
async function atDinner(): Promise<User> {
  await markLibraryLoggedIn();
  server.on('POST /assistant/messages', { status: 200, body: stepsReplyOn('2026-11-02') });
  const user = await openMain();
  await layStage(390, 760);
  await sendFromBar(user, '17시 반에 관정 갔다가 19시쯤 저녁 먹을래');
  await hideKeyboard();
  await user.press(screen.getByRole('button', { name: /^2번/u }));
  await pass(50);
  await layStepsCard();
  await layFolded(FOLDED);
  await pass(50);
  return user;
}

async function layStepsCard(): Promise<void> {
  await fireEvent(stepsCard(), 'layout', { nativeEvent: { layout: { x: 16, y: 8, width: 358, height: STEPS } } });
  await pass(50);
}

// The cards at the top, both named `time-bar`: the steps card first, the time card after it.
function stepsCard(): Found {
  const [steps] = screen.getAllByTestId('time-bar');
  if (steps === undefined) {
    throw new Error('no steps card');
  }
  return steps;
}

function timeCard(): Found | undefined {
  return screen.queryAllByTestId('time-bar')[1];
}

function styleOf(element: Found): ViewStyle {
  const style: unknown = element.props.style;
  return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
}

// Where a view rests, as React holds it: its translation.
function shiftOf(element: Found | undefined): number {
  if (element === undefined) {
    return Number.NaN;
  }
  const shift: unknown = styleOf(element).transform?.[0];
  return typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : 0;
}

const frame = (): Found => screen.getByTestId('time-card-frame');

// The steps card's bottom edge from the stage's top, where stop 0 takes it up to.
const stepsBottom = (): number => Number(styleOf(stepsCard()).top) + STEPS;

async function pressGrip(testID = 'time-card-grip'): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
  await pass(50);
}

async function pull(drag: string, dy: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(drag), [
      { translationY: 0, velocityY: 0 },
      { translationY: dy / 2, velocityY: 0 },
      { translationY: dy, velocityY: 0 },
    ]);
  });
  await pass(50);
}

// High's height: the sheet's scrolling part is laid out at it.
function highHeight(): number {
  return Number(styleOf(screen.getByTestId('answer-card-content')).height);
}

// Partitions: the fold by the grip's steps, by a press, by a drag; the stops in order and back; a long pull.
describe('the top of several requests', () => {
  it('folds the time card wholly behind the steps card, its strip under the steps card and nothing above it', async () => {
    await atDinner();
    const card = timeCard();

    await stepGrip('tuck');
    await pass(50);

    // The same card, never swapped for another shape: it stops short with its bottom STRIP under the steps card.
    expect(timeCard()).toBe(card);
    expect(shiftOf(timeCard())).toBe(-BEHIND);
    expect(shiftOf(stepsCard())).toBe(0);
    // It stands in a frame that starts under the steps card's rounded top and clips what is above.
    expect(styleOf(frame())).toMatchObject({ top: Number(styleOf(stepsCard()).top) + radius.xl, overflow: 'hidden' });
    expect(screen.getByTestId('time-card-grip')).toBeVisible();
    expect(screen.queryByTestId('top-tab')).toBeNull();
  });

  it('folds the steps card up with it to the stage top, and opens again a stop a press', async () => {
    await atDinner();
    await stepGrip('tuck');
    await pass(50);

    await stepGrip('tuck');
    await pass(50);
    // Stop 0: the steps card and the card's frame go up together until the steps card's bottom is at the stage's top.
    expect(shiftOf(stepsCard())).toBe(-stepsBottom());
    expect(shiftOf(frame())).toBe(-stepsBottom());
    expect(shiftOf(timeCard())).toBe(-BEHIND);

    await pressGrip();
    expect(shiftOf(stepsCard())).toBe(0);
    expect(shiftOf(timeCard())).toBe(-BEHIND);

    await pressGrip();
    expect(shiftOf(timeCard())).toBe(0);
  });

  it('goes up two stops in one long pull, and down two in one long pull', async () => {
    await atDinner();

    await pull('time-card-grip-drag', -600);
    expect(shiftOf(stepsCard())).toBe(-stepsBottom());

    await pull('time-card-grip-drag', 600 - FOLDED);
    expect(shiftOf(stepsCard())).toBe(0);
    expect(shiftOf(timeCard())).toBe(0);
  });
});

// Partitions: a step with no time card (the seat, ①), and back to the Plan at a folded stop.
describe('a seat step at the top', () => {
  it('has a strip of its own under the steps card, which folds to the stage top and opens nothing downward', async () => {
    const user = await atDinner();
    await user.press(screen.getByRole('button', { name: /^1번/u }));
    await pass(50);

    expect(timeCard()).toBeUndefined();
    expect(Number(styleOf(screen.getByTestId('steps-strip')).top)).toBe(stepsBottom() - radius.xl);
    await pressGrip('steps-strip-grip');
    await pull('steps-strip-drag', 200);
    expect(timeCard()).toBeUndefined();
    expect(shiftOf(stepsCard())).toBe(0);

    await pull('steps-strip-drag', -400);
    expect(shiftOf(stepsCard())).toBe(-stepsBottom());
    await pressGrip('steps-strip-grip');
    expect(shiftOf(stepsCard())).toBe(0);
  });

  it('brings the Plan back at the stop the top stands at, drawn only once it stands there', async () => {
    const user = await atDinner();
    await stepGrip('tuck');
    await pass(50);
    await user.press(screen.getByRole('button', { name: /^1번/u }));
    await pass(50);

    await user.press(screen.getByRole('button', { name: /^2번/u }));
    await pass(50);
    // Its height not yet known, its place behind the steps card is not known either: it is not drawn.
    expect(styleOf(timeCard() ?? stepsCard()).opacity).toBe(0);
    await layFolded(FOLDED);
    await pass(50);

    expect(styleOf(timeCard() ?? stepsCard()).opacity).toBe(1);
    expect(shiftOf(timeCard())).toBe(-BEHIND);
  });
});

// Partitions: the sheet's high at each stop; the sheet rising to high from stop 2. Expected values: at 2 high stands
// under the steps card, the gap and the time card, 120 + 8 + 100; at 1 under the steps card and the strip, 120 + 20;
// at 0 under the strip at the stage's top.
describe("the answer sheet's high at each stop", () => {
  it('stands under what is left at the top', async () => {
    await atDinner();
    const lists = Number(styleOf(stepsCard()).top);
    const atTwo = highHeight();

    await stepGrip('tuck');
    await pass(50);
    const atOne = highHeight();
    await stepGrip('tuck');
    await pass(50);
    const atZero = highHeight();

    expect(atOne).toBe(atTwo + (STEPS + space[2] + FOLDED) - (STEPS + STRIP));
    expect(atZero).toBe(atOne + (STEPS + STRIP) - (STRIP - lists));
  });

  it('folds the time card behind the steps card as the sheet rises to high, and leaves it there as it lowers', async () => {
    await atDinner();

    await raiseCard();
    await raiseCard();
    await pass(50);
    expect(shiftOf(timeCard())).toBe(-BEHIND);

    await lowerCard();
    await pass(50);
    expect(shiftOf(timeCard())).toBe(-BEHIND);
  });
});

// The reply to one request on screen, its time card laid out.
async function atMeal(): Promise<void> {
  server.on('POST /assistant/messages', { status: 200, body: MEAL_ANSWER_REPLY });
  const user = await openMain();
  await layStage(390, 760);
  await sendFromBar(user, '배고파');
  await hideKeyboard();
  await layFolded(FOLDED);
  await pass(50);
}

// An answer to one request folds as it did before the stops: its card tucked to its strip at the stage's top, in no
// frame, and the sheet rising to high leaves it as it stands.
describe('the top of one request', () => {
  it('tucks its card to the strip at the stage top, as before', async () => {
    await atMeal();
    const top = Number(styleOf(screen.getByTestId('time-bar')).top);

    await stepGrip('tuck');
    await pass(50);

    expect(shiftOf(screen.getByTestId('time-bar'))).toBe(-(top + FOLDED - STRIP));
    expect(screen.queryByTestId('time-card-frame')).toBeNull();
  });

  it('stays as it stands when the sheet rises to high', async () => {
    await atMeal();

    await raiseCard();
    await raiseCard();
    await pass(50);

    expect(shiftOf(screen.getByTestId('time-bar'))).toBe(0);
  });
});
