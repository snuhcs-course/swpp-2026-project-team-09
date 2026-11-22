/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { pass, screen } from './support/app';
import { holdBackButton } from './support/back';
import { AI_INPUT, button, layStage, SEND } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';

// P04 ticket 52, from the user's phone: a raised card has one more step up, to full height, its top at the stage's top
// (just under the status bar), its content scrolling inside; a drag down, the handle, and back take it one step down.
// The mocks answer.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const HANDLE = '답 크게 보기';
const STAGE = 760;

type User = Awaited<ReturnType<typeof openMain>>;

async function framed(): Promise<User> {
  const user = await openMain();
  await layStage(390, STAGE);
  await user.type(screen.getByLabelText(AI_INPUT), '식사 메뉴 추천');
  await press(user, SEND);
  await pass(300);
  await fireEvent(screen.getByTestId('answer-card-content'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 200 } },
  });
  return user;
}

function styleOf(testId: string): ViewStyle {
  const style: unknown = screen.getByTestId(testId).props.style;
  return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
}

async function dragHandle(dy: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId('answer-card-handle'), [
      { translationX: 0, translationY: 0, velocityY: 0 },
      { translationX: 0, translationY: dy / 2, velocityY: 0 },
      { translationX: 0, translationY: dy, velocityY: 0 },
    ]);
  });
}

// The lowered content is half the stage less the input's room, so the content at full height, its top at the stage's
// top, is that and half the stage.
function fullOf(lowered: number): number {
  return lowered + STAGE / 2;
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

// Partitions: a drag up on the raised card; a drag up on the lowered card.
describe('a drag up on the answer card', () => {
  it('takes the raised card to full height, its top at the stage’s top', async () => {
    const user = await framed();
    const lowered = Number(styleOf('answer-card-content').maxHeight);
    await press(user, HANDLE);

    await dragHandle(-600);

    expect(styleOf('answer-card-content').height).toBe(fullOf(lowered));
    expect(button(HANDLE)).toBeExpanded();
  });

  it('takes the lowered card one step only, to raised', async () => {
    await framed();

    await dragHandle(-600);

    expect(styleOf('answer-card-content').height).toBeUndefined();
    expect(button(HANDLE)).toBeExpanded();
  });
});

// Partitions: a drag down, a press on the handle, and back, each from full height.
describe('a full card', () => {
  it('goes one step down, to raised, by a drag down, a press on the handle, or back', async () => {
    const back = holdBackButton();
    const user = await framed();
    await press(user, HANDLE);

    await dragHandle(-600);
    await dragHandle(600);
    expect(styleOf('answer-card-content').height).toBeUndefined();
    expect(button(HANDLE)).toBeExpanded();

    await dragHandle(-600);
    await press(user, HANDLE);
    expect(styleOf('answer-card-content').height).toBeUndefined();
    expect(button(HANDLE)).toBeExpanded();

    await dragHandle(-600);
    expect(await back()).toBe(true);
    expect(styleOf('answer-card-content').height).toBeUndefined();
    expect(button(HANDLE)).toBeExpanded();
  });
});

// Partitions: the caption's list of questions on the lowered card and on the raised one.
describe('the list of questions', () => {
  it('fits the card’s room at each height, lowered, raised, and full, ending above the input', async () => {
    const user = await framed();
    const lowered = Number(styleOf('answer-card-content').maxHeight);
    await user.press(screen.getByTestId('answer-caption'));
    expect(styleOf('question-list').maxHeight).toBeLessThan(STAGE / 2);

    const loweredList = Number(styleOf('question-list').maxHeight);
    await press(user, HANDLE);
    // Raised, the list takes the raised card's room, ending above the input (P04 ticket 52).
    expect(Number(styleOf('question-list').maxHeight)).toBeGreaterThan(loweredList);

    await dragHandle(-600);
    expect(styleOf('answer-card-content').height).toBe(fullOf(lowered));
    // Full, the list takes the whole scrolling part less its padding, so that it ends above the input.
    expect(styleOf('question-list').maxHeight).toBe(fullOf(lowered) - 24);
  });
});
