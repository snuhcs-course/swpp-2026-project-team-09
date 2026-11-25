/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { pass, screen } from './support/app';
import { grip, raiseCard } from './support/card-grip';
import { AI_INPUT, layStage, SEND } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';

// P04 tickets 52, 61, and 63: the caption's list of questions keeps the step the card stood at, and takes its whole
// height in the card's content, which scrolls it, so that a drag on it moves the card as on any answer. The mocks
// answer.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

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

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// Partitions: the list opened on the low card and on the middle one.
describe('the list of questions', () => {
  it('keeps the low step and has no scroll or most height of its own', async () => {
    const user = await framed();
    await user.press(screen.getByTestId('answer-caption'));

    expect(grip()).toBeCollapsed();
    expect(styleOf('question-list').maxHeight).toBeUndefined();
    expect(screen.getByTestId('question-list-rows')).toHaveProp('scrollEnabled', false);
  });

  it('keeps the middle step it was opened at', async () => {
    const user = await framed();
    await raiseCard();
    expect(grip()).toHaveAccessibilityValue({ text: '중간' });

    await user.press(screen.getByTestId('answer-caption'));

    expect(screen.getByTestId('question-list')).toBeVisible();
    expect(grip()).toHaveAccessibilityValue({ text: '중간' });
  });
});
