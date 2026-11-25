/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import type { Level } from '@/screens/main/answer/card-levels';
import { FrameCard } from '@/screens/main/answer/frame-card';

// P04 ticket 63, the user's phone (2026-11-25): opening people picking in the time card laid the time card out again,
// and its height came back a fraction of a point different each time (its rows' fractional height taken from a
// height the phone rounds to its pixels). The sheet's steps hung on that height, so every report moved the sheet in
// React's render, and the reports and the renders never settled ("Maximum update depth exceeded"). A height the sheet
// is measured against now moves it only when it changes by half a point or more. Expected values: the card's
// translation, which is where it stands.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => false,
  useMotionAllowed: (): boolean => true,
  useReduceMotionSetting: (): boolean => false,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

function card(level: Level, timeBarHeight: number): React.ReactElement {
  return (
    <FrameCard
      barRoom={132}
      onClose={jest.fn<undefined, []>()}
      onHeight={jest.fn<undefined, [number]>()}
      raising={{ level, setLevel: jest.fn<undefined, [Level]>(), close: jest.fn<undefined, []>() }}
      stageHeight={800}
      testID="card"
      timeBarHeight={timeBarHeight}
    >
      <Text>12:15에 302동식당에서 민수와 만나 먹어요.</Text>
    </FrameCard>
  );
}

function translate(): number {
  const style: unknown = getAnimatedStyle(screen.getByTestId('card'));
  const { transform } = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  const shift: unknown = Array.isArray(transform) ? transform[0] : undefined;
  return typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : Number.NaN;
}

async function settle(): Promise<void> {
  await act(() => {
    jest.advanceTimersByTime(1000);
  });
}

async function layHeader(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('card-top'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
  });
}

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

// Partitions: the time card's height a fraction of a point off, at low and at middle; the header's; a change of a
// whole point, which moves the sheet.
describe('a height the sheet is measured against', () => {
  it.each<Level>(['low', 'mid'])(
    'leaves the sheet at %s where it stands when the time card’s height moves a fraction of a point',
    async (level) => {
      const view = await render(card(level, 112));
      await settle();
      const before = translate();

      await view.rerender(card(level, 111.79));
      await settle();
      await view.rerender(card(level, 111.71));
      await settle();

      expect(translate()).toBe(before);
    },
  );

  it('leaves the sheet where it stands when the header’s height moves a fraction of a point', async () => {
    await render(card('low', 112));
    await layHeader(60.19);
    await settle();
    const before = translate();

    await layHeader(60.4);
    await settle();

    expect(translate()).toBe(before);
  });

  it('moves the sheet when the time card’s height changes by a whole point', async () => {
    const view = await render(card('mid', 112));
    await settle();
    const before = translate();

    await view.rerender(card('mid', 160));
    await settle();

    expect(translate()).not.toBe(before);
  });
});
