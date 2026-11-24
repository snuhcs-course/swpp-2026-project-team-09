/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { FrameCard } from '@/screens/main/answer/frame-card';
import type { Raising } from '@/screens/main/answer/raise-handle';

// One card for every answer that docks (P04 ticket 57): the dock lies over the open card's content, and the lowered
// step is the dock's own height, so that lowering moves the same card down and nothing is swapped when the motion
// ends. The step the card shows is read from the tail under its content: the laid-out height less the height that
// shows.

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
// The dock's content as laid out; the dock adds the gap over it.
const DOCK_CONTENT = 188;
const DOCK = DOCK_CONTENT + 12;
const OPEN = '12:15에 302동식당에서 민수와 만나 먹어요.';
const DOCKED = '도크의 한 줄';

const mounts = { open: 0, dock: 0 };

function Counted({ kind, words }: { kind: 'open' | 'dock'; words: string }): React.ReactElement {
  useEffect(() => {
    mounts[kind] += 1;
  }, [kind]);
  return <Text>{words}</Text>;
}

function raisingOf(raised: boolean): Raising {
  return { raised, setRaised: jest.fn<undefined, [boolean]>(), close: jest.fn<undefined, []>() };
}

function card(raised: boolean): React.ReactElement {
  return (
    <FrameCard
      barRoom={BAR_ROOM}
      dock={<Counted kind="dock" words={DOCKED} />}
      onClose={jest.fn<undefined, []>()}
      onHeight={jest.fn<undefined, [number]>()}
      raising={raisingOf(raised)}
      stageHeight={STAGE}
      testID="card"
    >
      <Counted kind="open" words={OPEN} />
    </FrameCard>
  );
}

function heightOf(id: string): number {
  const style: unknown = screen.getByTestId(id, { includeHiddenElements: true }).props.style;
  return Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).height);
}

async function layDock(): Promise<void> {
  await fireEvent(screen.getByTestId('card-dock-parts', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: DOCK_CONTENT } },
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mounts.open = 0;
  mounts.dock = 0;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('a card that docks', () => {
  it('runs down to the dock’s height and stays the same card once the motion is over', async () => {
    const view = await render(card(true));
    await layDock();

    await view.rerender(card(false));
    await act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(heightOf('card-content') - heightOf('card-tail')).toBe(DOCK);
    expect(mounts).toEqual({ open: 1, dock: 1 });
  });

  it('shows the dock to a screen reader at rest and the open content raised, mounting neither again', async () => {
    const view = await render(card(false));
    await layDock();
    expect(screen.getByText(DOCKED)).toBeOnTheScreen();
    expect(screen.queryByText(OPEN)).toBeNull();

    await view.rerender(card(true));
    expect(screen.getByText(OPEN)).toBeOnTheScreen();
    expect(screen.queryByText(DOCKED)).toBeNull();

    await view.rerender(card(false));
    await act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByText(DOCKED)).toBeOnTheScreen();
    expect(mounts).toEqual({ open: 1, dock: 1 });
  });
});
