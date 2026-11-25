/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { text } from '@/design-system';
import { FLING_SPEED } from '@/screens/main/answer/card-levels';
import { listsTop } from '@/screens/main/layout';
import { pass, screen } from './support/app';
import { holdBackButton } from './support/back';
import { grip, lowerCard, raiseCard } from './support/card-grip';
import { KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT, button, layStage, SEND } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';

// P02 ticket 38 and P04 ticket 61: the answer card rises a step at a time, low, middle, and high up to under the time
// bar, and lowers again, by a drag anywhere on it or a screen reader's step, and Android's back button lowers a raised
// card first. The mocks answer. Expected values (P04 ticket 63): low's top edge is the meal answer's with its main
// button, the content's top padding of 12, two lines of 24, and the fade of 12 at the usual font size; this answer has
// no main button, so its words take that row's room, the button's 50 and its gap of 8. Middle covers 60% of the stage.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const ASKED = '식사 메뉴 추천';
const STAGE = 760;
// Where the raised card stops, the answer having no time bar: the lists' top, the tests' status bar taking nothing
// (P04 ticket 52: no "←" stands there any more).
const TOP_ROOM = listsTop(0);
const LOW = 12 + 2 * text.bodyLg.lineHeight + 12 + 50 + 8;
const FLING = FLING_SPEED * 2;

type User = Awaited<ReturnType<typeof openMain>>;

async function ask(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await press(user, SEND);
  await pass(300);
}

async function framed(): Promise<User> {
  const user = await openMain();
  await layStage(390, STAGE);
  await ask(user, ASKED);
  return user;
}

function contentStyle(): ViewStyle {
  const style: unknown = screen.getByTestId('answer-card-content').props.style;
  return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
}

// What of the scrolling part shows: it is laid out once at its highest step's height, and the card stands that much
// lower than its place, less what shows (P04 tickets 52 and 61).
async function shown(): Promise<number> {
  // The card's translation is drawn on the next frame.
  await pass(50);
  const style: unknown = screen.getByTestId('answer-card').props.style;
  const { transform } = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  const shift: unknown = Array.isArray(transform) ? transform[0] : undefined;
  const down = typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : 0;
  return Number(contentStyle().height) - down;
}

async function layContent(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('answer-card-content'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
  });
}

async function dragHandle(dy: number, velocityY = 0): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId('answer-card-drag'), [
      { translationX: 0, translationY: 0, velocityY: 0 },
      { translationX: 0, translationY: dy / 2, velocityY },
      { translationX: 0, translationY: dy, velocityY },
    ]);
  });
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

// Partitions: low, and the middle and high steps up and down by the grip's steps for a screen reader: nothing is pressed
// (P04 ticket 52).
describe("the answer card's handle", () => {
  it('stands on the low card, which shows two lines of its content', async () => {
    await framed();

    expect(grip()).toBeCollapsed();
    expect(await shown()).toBe(LOW);
  });

  it('raises the card a step at a time, the middle at 60% of the stage, high up to the lists’ top', async () => {
    await framed();

    await raiseCard();
    expect(grip()).toBeExpanded();
    const middle = await shown();
    expect(middle).toBeGreaterThan(LOW);
    expect(middle).toBeLessThanOrEqual(STAGE * 0.6);

    await raiseCard();
    expect(await shown()).toBe(middle + STAGE * 0.4 - TOP_ROOM);
    expect(button('답 닫기')).toBeVisible();

    await lowerCard();
    expect(await shown()).toBe(middle);
    await lowerCard();
    expect(grip()).toBeCollapsed();
    expect(await shown()).toBe(LOW);
  });
});

// Partitions: a fling up and down, a short drag; what the card keeps.
describe('a drag on the answer card', () => {
  it('raises the card a step by a fling up, and lowers it by a fling down', async () => {
    await framed();
    await layContent(200);

    await dragHandle(-30, -FLING);
    expect(grip()).toHaveAccessibilityValue({ text: '중간' });

    await dragHandle(30, FLING);
    expect(grip()).toBeCollapsed();
  });

  it('keeps the card where it was after a short drag', async () => {
    await framed();
    await layContent(200);

    await dragHandle(-40);

    expect(grip()).toBeCollapsed();
  });

  it('keeps the conversation and the words being written', async () => {
    const user = await framed();
    await user.type(screen.getByLabelText(AI_INPUT), '저녁은?');

    await raiseCard();
    await lowerCard();

    expect(screen.getByTestId('answer-caption')).toHaveTextContent('식사 메뉴 추천');
    expect(screen.getByTestId('answer-card-content')).toHaveTextContent(/^오늘 메뉴예요\./u);
    expect(screen.getByLabelText(AI_INPUT)).toHaveDisplayValue('저녁은?');
  });
});

// Partitions: the keyboard up while raised and lowered. While typing on the lowered card, the reply's first line stands
// above the input in place of the answer and its caption; the questions open by the history chip alone (P04 ticket 52).
describe('the raised card while the keyboard is up', () => {
  it('shows the answer under its caption, not the questions, over the input standing on the keyboard', async () => {
    await framed();
    await raiseCard();

    await showKeyboard(KEYBOARD);

    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(screen.getByTestId('answer-caption')).toHaveTextContent(ASKED);
    expect(screen.getByTestId('answer-caption')).toHaveTextContent('식사 메뉴 추천');
    expect(screen.getByTestId('answer-card-content')).toHaveTextContent(/^오늘 메뉴예요\./u);
  });

  it("shows the reply's first line in place of the answer once lowered, and no questions (P04 ticket 52)", async () => {
    await framed();
    await raiseCard();
    await showKeyboard(KEYBOARD);

    await lowerCard();

    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(screen.getByTestId('typing-words')).toHaveTextContent(/^오늘 메뉴예요\./u);
  });
});

// Partitions: raised and lowered.
describe("Android's back button", () => {
  it('lowers a raised card first, and then hides the frame', async () => {
    const back = holdBackButton();
    await framed();
    await raiseCard();

    expect(await back()).toBe(true);
    expect(grip()).toBeCollapsed();
    expect(screen.getByTestId('answer-caption')).toBeVisible();

    expect(await back()).toBe(true);
    expect(screen.queryByTestId('answer-caption')).toBeNull();
  });
});

// P04 tickets 12 and 61: from the low card, one more drag down closes the answer as ✕ does.
async function layCard(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('answer-card'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
  });
}

// Partitions: past half the card; a short drag; from the raised card. The hint while held is seen on a phone: the
// test's gesture always ends.
describe('a drag down on the low card', () => {
  it('closes the answer past half the card, and keeps the conversation', async () => {
    await framed();
    await layContent(200);
    await layCard(300);

    await dragHandle(400);

    expect(screen.queryByTestId('answer-caption')).toBeNull();
    expect(screen.getByRole('button', { name: /^이어서, 식사 메뉴 추천/u })).toBeVisible();
  });

  it('goes back after a short drag', async () => {
    await framed();
    await layContent(200);
    await layCard(300);

    await dragHandle(20);

    expect(screen.getByTestId('answer-caption')).toBeVisible();
    expect(grip()).toBeCollapsed();
    expect(screen.queryByTestId('answer-close-hint')).toBeNull();
  });

  it('only lowers a raised card, and the next drag closes', async () => {
    await framed();
    await layContent(200);
    await layCard(300);
    await raiseCard();

    await dragHandle(400);
    expect(grip()).toBeCollapsed();
    expect(screen.getByTestId('answer-caption')).toBeVisible();

    await dragHandle(400);
    expect(screen.queryByTestId('answer-caption')).toBeNull();
  });
});
