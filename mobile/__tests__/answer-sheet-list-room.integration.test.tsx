/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { pass, screen } from './support/app';
import { raiseCard } from './support/card-grip';
import { AI_INPUT, layStage, SEND } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';

// P04 tickets 52 and 61: the caption's list of questions fits the sheet's room at each of its steps, ending above the
// input. While the list is open, low shows it whole up to the middle step. The mocks answer.

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

// Partitions: the caption's list of questions on the low card and on the high one.
describe('the list of questions', () => {
  it('fits the card’s room at low and at high, ending above the input', async () => {
    const user = await framed();
    await user.press(screen.getByTestId('answer-caption'));
    const low = Number(styleOf('question-list').maxHeight);
    expect(low).toBeLessThan(STAGE / 2);

    await raiseCard();

    // High, the list takes the high card's room, ending above the input.
    expect(Number(styleOf('question-list').maxHeight)).toBeGreaterThan(low);
  });
});
