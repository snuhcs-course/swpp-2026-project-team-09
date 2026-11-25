/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { FrameCard } from '@/screens/main/answer/frame-card';
import type { Level } from '@/screens/main/answer/card-levels';

// P04 ticket 63, the user's phone with PR 552 merged (2026-11-26): "하단 카드 높게를 화면 전체로 수정했구나? 원래는
// 시간 바 밑까지였잖아". High stands under the time card at the height it tells. A time card laid out while it changed
// (its rows' room shut by the sheet rising under it, and React still holding it open) told its folded height less the
// rows' room, under its folded least or below 0, and high rose over it to the stage's top. Such a height now keeps
// high where the last height fit to measure by put it; 0 is still no time card. Expected values: the height of the
// card's scrolling part, laid out at high's.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => false,
  useMotionAllowed: (): boolean => true,
  useReduceMotionSetting: (): boolean => false,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const FOLDED = 112;

function card(timeBarHeight: number): React.ReactElement {
  return (
    <FrameCard
      barRoom={132}
      onClose={jest.fn<undefined, []>()}
      onHeight={jest.fn<undefined, [number]>()}
      raising={{ level: 'high', setLevel: jest.fn<undefined, [Level]>(), close: jest.fn<undefined, []>() }}
      stageHeight={800}
      testID="card"
      timeBarHeight={timeBarHeight}
    >
      <Text>12:15에 302동식당에서 민수와 만나 먹어요.</Text>
    </FrameCard>
  );
}

function high(): number {
  const style: unknown = screen.getByTestId('card-content').props.style;
  return Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).height);
}

async function settle(): Promise<void> {
  await act(() => {
    jest.advanceTimersByTime(1000);
  });
}

// High under the folded time card, then the time card told again `next`, one height after another.
async function highAfter(...next: number[]): Promise<{ before: number; after: number }> {
  const view = await render(card(FOLDED));
  await settle();
  const before = high();
  await next.reduce(async (told: Promise<void>, height) => {
    await told;
    await view.rerender(card(height));
    await settle();
  }, Promise.resolve());
  return { before, after: high() };
}

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

// Partitions: a told height under the folded least, above 0 and below it; 0, no time card; under the least after 0.
describe('high under the time card', () => {
  it.each([30, -90])('stays where it stood when the time card tells %d', async (told) => {
    const { before, after } = await highAfter(told);

    expect(after).toBe(before);
  });

  it('rises to the stage’s top when there is no time card', async () => {
    const { before, after } = await highAfter(0);

    expect(after).toBeGreaterThan(before);
  });

  it('stands under the last height fit to measure by when the time card comes back telling too little', async () => {
    const { before, after } = await highAfter(0, -90);

    expect(after).toBe(before);
  });
});
