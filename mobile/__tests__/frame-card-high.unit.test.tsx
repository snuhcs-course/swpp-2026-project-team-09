/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet, Text, type ViewStyle } from 'react-native';
import { space } from '@/design-system';
import { listsTop } from '@/screens/main/layout';
import { foldedTimeCardOf } from '@/screens/main/answer/card-caps';
import { BAR_ADD_HEIGHT } from '@/screens/main/answer/condition-chips';
import type { Level } from '@/screens/main/answer/card-levels';
import { FrameCard } from '@/screens/main/answer/frame-card';

// P04 ticket 63, the user's phone (2026-11-26): high's top edge is one line for every answer and state, just under the
// place the folded time card takes, whether one stands there or not. While "내일 저녁" loaded, before its time card,
// high covered the whole screen; with the time card it stopped under it. The card no longer hears the time card's
// height at all; `answer-sheet-high` asks on the whole screen. Expected values: the height of the card's scrolling part,
// laid out at high's: the stage less the lists' top, the folded card's place and its gap, and the bar's room.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => false,
  useMotionAllowed: (): boolean => true,
  useReduceMotionSetting: (): boolean => false,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const STAGE = 800;
const BAR_ROOM = 132;

function card(): React.ReactElement {
  return (
    <FrameCard
      barRoom={BAR_ROOM}
      onClose={jest.fn<undefined, []>()}
      onHeight={jest.fn<undefined, [number]>()}
      raising={{ level: 'high', setLevel: jest.fn<undefined, [Level]>(), close: jest.fn<undefined, []>() }}
      stageHeight={STAGE}
      testID="card"
    >
      <Text>둘 다 가까운 302동식당을 추천해요.</Text>
    </FrameCard>
  );
}

function high(): number {
  const style: unknown = screen.getByTestId('card-content').props.style;
  return Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).height);
}

function setFontScale(fontScale: number): void {
  Dimensions.set({
    window: { ...Dimensions.get('window'), fontScale },
    screen: { ...Dimensions.get('screen'), fontScale },
  });
}

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  setFontScale(1);
  jest.useRealTimers();
});

// Partitions: the usual font size; a larger one, whose rows of words in the time card grow. The folded card's place:
// its padding 12, the head's row (the chips' height), the lane 20, the ends' row, 4 apart, and the grip's strip 20 under a gap of 4.
describe('high’s top edge', () => {
  it('stands just under the folded time card’s place', async () => {
    await render(card());
    await act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(foldedTimeCardOf(1)).toBe(12 + BAR_ADD_HEIGHT + 4 + 20 + 4 + 16 + 4 + 20);
    expect(high()).toBe(STAGE - listsTop(0) - foldedTimeCardOf(1) - space[2] - BAR_ROOM);
  });

  it('stands lower with a larger font, by what the time card’s rows of words grow', async () => {
    setFontScale(1.5);
    await render(card());
    await act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(foldedTimeCardOf(1.5)).toBe(foldedTimeCardOf(1) + 8);
    expect(high()).toBe(STAGE - listsTop(0) - foldedTimeCardOf(1.5) - space[2] - BAR_ROOM);
  });
});
