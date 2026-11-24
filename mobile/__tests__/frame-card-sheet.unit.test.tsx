/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { getAnimatedStyle } from 'react-native-reanimated';
import { text } from '@/design-system';
import type { Level } from '@/screens/main/answer/card-levels';
import { FrameCard } from '@/screens/main/answer/frame-card';
import { SHEET_HINT } from '@/screens/main/answer/sheet-hint';

// The answer's sheet as one surface (P04 ticket 61): its content is laid out once and moved between low, middle, and
// high; low shows about two lines of it, at the phone's font size, over the fade; no words stand under the grip, and a
// first-time hint says the grip raises it, once a phone. The step the card stands at is read from its translation: the
// laid-out height of the scrolling part less what shows. Expected values: the content's top padding of 12, two lines of
// 24, and the fade of 12 at the usual font size; a content of 1000 is taller than every step. Middle shows half the
// stage less the footer's room, as no status bar or header is laid out here.

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
const FADE = 12;
const LOW = 12 + 2 * text.bodyLg.lineHeight + FADE;
const MID = STAGE / 2 - BAR_ROOM;
const WORDS = '12:15에 302동식당에서 민수와 만나 먹어요.';

const mounts = { content: 0 };

function Counted(): React.ReactElement {
  useEffect(() => {
    mounts.content += 1;
  }, []);
  return <Text>{WORDS}</Text>;
}

function card(level: Level, setLevel = jest.fn<undefined, [Level]>()): React.ReactElement {
  return (
    <FrameCard
      barRoom={BAR_ROOM}
      onClose={jest.fn<undefined, []>()}
      onHeight={jest.fn<undefined, [number]>()}
      raising={{ level, setLevel, close: jest.fn<undefined, []>() }}
      stageHeight={STAGE}
      testID="card"
    >
      <Counted />
    </FrameCard>
  );
}

function heightOf(id: string): number {
  const style: unknown = screen.getByTestId(id, { includeHiddenElements: true }).props.style;
  return Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).height);
}

function translateOf(id: string): number {
  const style: unknown = getAnimatedStyle(screen.getByTestId(id));
  const { transform } = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  const shift: unknown = Array.isArray(transform) ? transform[0] : undefined;
  return typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : Number.NaN;
}

// How much of the scrolling part shows: its laid-out height less how far the card stands below its place.
function shown(): number {
  return heightOf('card-content') - translateOf('card');
}

async function layContent(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('card-parts', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: height - 12 } },
  });
}

// A slow drag on the content, `dy` down.
async function drag(dy: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId('answer-card-drag'), [
      { translationY: 0, velocityY: 0 },
      { translationY: dy / 2, velocityY: 0 },
      { translationY: dy, velocityY: 0 },
    ]);
  });
}

async function settle(): Promise<void> {
  await act(() => {
    jest.advanceTimersByTime(1000);
  });
}

beforeEach(async () => {
  jest.useFakeTimers();
  mounts.content = 0;
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

// Partitions: low, high, middle; a content taller than every step, one shorter than low, and one with nothing.
describe('the sheet’s steps', () => {
  it('shows two lines of the content at low and keeps one content mounted up to high', async () => {
    const view = await render(card('low'));
    await layContent(1000);
    await settle();
    expect(shown()).toBe(LOW);

    await view.rerender(card('high'));
    await settle();

    expect(shown()).toBe(heightOf('card-content'));
    expect(mounts.content).toBe(1);
  });

  it('stops a content shorter than low at its own height and the fade’s', async () => {
    await render(card('low'));
    await layContent(50);
    await settle();

    expect(shown()).toBe(50 + FADE);
  });

  it('takes no room for a content that lays out nothing, as a meet whose Friend has a face on the map', async () => {
    await render(card('low'));
    await layContent(12);
    await settle();

    expect(shown()).toBe(0);
  });

  it('stands middle at half the stage', async () => {
    await render(card('mid'));
    await layContent(1000);
    await settle();

    expect(shown()).toBe(MID);
  });

  it('has no words under the grip', async () => {
    await render(card('low'));

    expect(within(screen.getByTestId('answer-card-handle')).queryByText(/./u)).toBeNull();
  });
});

// Partitions: at middle, a drag up and down within the content's range, then down past its top; at low, a drag up on a
// content longer than what shows.
describe('a drag on the content', () => {
  it('scrolls a long content at middle and leaves the card there until the content is back at its top', async () => {
    const setLevel = jest.fn<undefined, [Level]>();
    await render(card('mid', setLevel));
    await layContent(1000);
    await settle();

    // Moved by the card, 250 up would land it high, and 200 down low.
    await drag(-250);
    await drag(200);
    await settle();
    expect(shown()).toBe(MID);
    expect(setLevel).not.toHaveBeenCalled();

    // 50 scrolls the content back to its top, and the card comes 200 down, nearer low than middle.
    await drag(250);
    expect(setLevel).toHaveBeenCalledWith('low');
  });

  it('scrolls a long content at low too, and leaves the card low', async () => {
    const setLevel = jest.fn<undefined, [Level]>();
    await render(card('low', setLevel));
    await layContent(1000);
    await settle();

    // Moved by the card, 400 up would land it at middle.
    await drag(-400);
    await settle();

    expect(shown()).toBe(LOW);
    expect(setLevel).not.toHaveBeenCalled();
  });
});

// Partitions: the first sheet on a phone, which a touch takes away; a later one; a sheet with nothing more to show.
describe('the first-time hint', () => {
  it('shows once a phone over the low sheet and leaves at the first touch of the card', async () => {
    const first = await render(card('low'));
    await layContent(1000);
    await settle();
    expect(screen.getByText(SHEET_HINT)).toBeOnTheScreen();

    await fireEvent(screen.getByTestId('card'), 'touchStart');
    expect(screen.queryByText(SHEET_HINT)).toBeNull();
    await first.unmount();

    await render(card('low'));
    await layContent(1000);
    await settle();
    expect(screen.queryByText(SHEET_HINT)).toBeNull();
  });

  it('does not show over a sheet that has nothing more to show', async () => {
    await render(card('low'));
    await layContent(50);
    await settle();

    expect(screen.queryByText(SHEET_HINT)).toBeNull();
  });
});
