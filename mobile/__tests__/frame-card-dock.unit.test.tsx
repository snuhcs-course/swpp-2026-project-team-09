/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { FrameCard } from '@/screens/main/answer/frame-card';
import type { Raising } from '@/screens/main/answer/raise-handle';

// Lowering into the dock (P04 ticket 54): the open card runs down to the dock's own height, where the dock takes its
// place, so that nothing moves at the swap. The step the open card shows is read from the tail under its content: the
// laid-out height less the height that shows.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => false,
  useMotionAllowed: (): boolean => true,
  useReduceMotionSetting: (): boolean => false,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const STAGE = 800;
const BAR_ROOM = 40;
const DOCK = 200;

function raisingOf(raised: boolean): Raising {
  return { raised, setRaised: jest.fn<undefined, [boolean]>(), close: jest.fn<undefined, []>() };
}

function card(docked: boolean, raised: boolean): React.ReactElement {
  return (
    <FrameCard
      barRoom={BAR_ROOM}
      dock={docked ? <Text>도크의 한 줄</Text> : undefined}
      docked={docked}
      onClose={jest.fn<undefined, []>()}
      onHeight={jest.fn<undefined, [number]>()}
      raising={raisingOf(raised)}
      stageHeight={STAGE}
      testID="card"
    >
      <Text>12:15에 302동식당에서 민수와 만나 먹어요.</Text>
    </FrameCard>
  );
}

function heightOf(id: string): number {
  const style: unknown = screen.getByTestId(id, { includeHiddenElements: true }).props.style;
  return Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).height);
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('a card lowered into its dock', () => {
  it('runs the open card down to the dock’s height before the dock takes its place', async () => {
    const view = await render(card(true, false));
    await fireEvent(screen.getByTestId('card'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: DOCK } },
    });
    // Raised: the open card, grown from the dock.
    await view.rerender(card(false, true));

    // Lowered, the dock coming: the open card shows the dock's height, its top and the input's room taken away.
    await view.rerender(card(true, false));

    const room = heightOf('card-content');
    expect(room - heightOf('card-tail')).toBe(DOCK - BAR_ROOM);
    await act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.queryByTestId('card-tail', { includeHiddenElements: true })).toBeNull();
  });

  it('keeps the open card’s own content while it runs down, and shows the dock’s once the dock stands', async () => {
    const view = await render(card(false, true));

    await view.rerender(card(true, false));

    expect(screen.getByText('12:15에 302동식당에서 민수와 만나 먹어요.')).toBeOnTheScreen();
    expect(screen.queryByText('도크의 한 줄')).toBeNull();
    await act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByText('도크의 한 줄')).toBeOnTheScreen();
  });
});
