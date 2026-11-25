/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
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
// React's render, and the reports and the renders never settled ("Maximum update depth exceeded"). The sheet no longer
// hears the time card's height (`frame-card-high`), and its header's height moves it only when it changes by half a
// point or more. Expected values: the card's translation, which is where it stands.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => false,
  useMotionAllowed: (): boolean => true,
  useReduceMotionSetting: (): boolean => false,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

function card(level: Level): React.ReactElement {
  return (
    <FrameCard
      barRoom={132}
      onClose={jest.fn<undefined, []>()}
      onHeight={jest.fn<undefined, [number]>()}
      raising={{ level, setLevel: jest.fn<undefined, [Level]>(), close: jest.fn<undefined, []>() }}
      stageHeight={800}
      testID="card"
    >
      <Text>둘 다 가까운 302동식당을 추천해요.</Text>
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

// Partitions: the header's height a fraction of a point off; a change of many points, which moves the sheet.
describe('the header’s height the sheet is measured against', () => {
  it('leaves the sheet where it stands when the header’s height moves a fraction of a point', async () => {
    await render(card('low'));
    await layHeader(60.19);
    await settle();
    const before = translate();

    await layHeader(60.4);
    await settle();

    expect(translate()).toBe(before);
  });

  it('moves the sheet when the header’s height changes by many points', async () => {
    await render(card('low'));
    await layHeader(60.19);
    await settle();
    const before = translate();

    await layHeader(90);
    await settle();

    expect(translate()).not.toBe(before);
  });
});
