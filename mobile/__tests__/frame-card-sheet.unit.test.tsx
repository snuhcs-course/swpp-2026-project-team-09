/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, type ViewStyle } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { getAnimatedStyle } from 'react-native-reanimated';
import { color, text } from '@/design-system';
import type { Level } from '@/screens/main/answer/card-levels';
import { FrameCard } from '@/screens/main/answer/frame-card';
import { SHEET_HINT } from '@/screens/main/answer/sheet-hint';

// The answer's sheet as one surface (P04 tickets 61 and 63): its content is laid out once and moved between low, middle,
// and high; low has one top edge for every footer, the meal answer's, which shows two lines of words, at the phone's
// font size, over the fade; no words stand under the grip, and a first-time hint says the grip raises it, once a phone.
// The step the card stands at is read from its translation: the laid-out height of the scrolling part less what shows.
// Expected values: the meal answer's footer of 132 (the input's 12 and 50, a gap of 8, the main button's row of 50,
// and 12 over them); the content's top padding of 12, two lines of 24, and the fade of 12 at the usual font size; a
// content of 1000 is taller than every step. Middle covers 60% of the stage less the footer's room, as no status bar or
// header is laid out here.

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => false,
  useMotionAllowed: (): boolean => true,
  useReduceMotionSetting: (): boolean => false,
}));
// The navigation's inset at the screen's bottom, which lifts the input over it; 0 unless a test sets it.
const mockInsets = { bottom: 0 };
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: (): object => ({ top: 0, right: 0, bottom: mockInsets.bottom, left: 0 }),
}));

const STAGE = 800;
const BAR_ROOM = 132;
const FADE = 12;
const LOW = 12 + 2 * text.bodyLg.lineHeight + FADE;
const MID = STAGE * 0.6 - BAR_ROOM;
// A footer of the input alone: no main button.
const BARE_ROOM = 12 + 50 + 12;
const WORDS = '둘 다 가까운 302동식당을 추천해요.';

const mounts = { content: 0 };

function Counted(): React.ReactElement {
  useEffect(() => {
    mounts.content += 1;
  }, []);
  return <Text>{WORDS}</Text>;
}

function card(level: Level, setLevel = jest.fn<undefined, [Level]>(), barRoom = BAR_ROOM): React.ReactElement {
  return (
    <FrameCard
      barRoom={barRoom}
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
  mockInsets.bottom = 0;
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

  // P04 ticket 63 and the user's phone check of a restaurant's menu: every step stands at its share for every answer,
  // a short one too, the content at the top and room under it.
  it('stands a content shorter than low at low, middle at 60% of the stage, and high all the same', async () => {
    const view = await render(card('low'));
    await layContent(50);
    await settle();
    expect(shown()).toBe(LOW);

    await view.rerender(card('mid'));
    await settle();
    expect(shown()).toBe(MID);
    await view.rerender(card('high'));
    await settle();
    expect(shown()).toBe(heightOf('card-content'));
  });

  it('takes no room for a content that lays out nothing, as a meet whose Friend has a face on the map', async () => {
    await render(card('low'));
    await layContent(12);
    await settle();

    expect(shown()).toBe(0);
  });

  it('has no words under the grip', async () => {
    await render(card('low'));

    expect(within(screen.getByTestId('answer-card-handle')).queryByText(/./u)).toBeNull();
  });
});

// P04 ticket 63. Partitions: a footer without a main button at low, and at middle; a footer lifted over the
// navigation's inset.
describe('low over a smaller footer', () => {
  // The emulator's check: with gesture navigation the input stands 24 higher, and the meal answer still shows two lines.
  it('counts the navigation inset under the footer, so the meal answer still shows two lines', async () => {
    mockInsets.bottom = 24;
    await render(card('low', undefined, BAR_ROOM + 24));
    await layContent(1000);
    await settle();

    expect(shown()).toBe(LOW);
  });

  // P04 ticket 63: an answer without a main button gives that row's room to its words, whole lines of them, and the
  // room under the last whole line is covered in the sheet's colour.
  it('keeps the top edge over a footer without a main button, and shows its words in whole lines', async () => {
    const view = await render(card('low', undefined, BARE_ROOM));
    await layContent(1000);
    await settle();

    const above = LOW + BAR_ROOM - BARE_ROOM;
    expect(shown()).toBe(above);
    const lines = Math.floor((above - 12 - FADE) / text.bodyLg.lineHeight);
    expect(lines).toBe(4);
    expect(heightOf('answer-card-band')).toBe(above - 12 - lines * text.bodyLg.lineHeight);
    expect(getAnimatedStyle(screen.getByTestId('answer-card-band'))).toMatchObject({ opacity: 1 });
    // PR 553's review: fully scrolled at low, the content's end comes clear of the band, not only of the fade.
    const style: unknown = screen.getByTestId('card-content').props.contentContainerStyle;
    const { paddingBottom } = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
    expect(paddingBottom).toBe(heightOf('card-content') - above + heightOf('answer-card-band'));

    // Raised to middle, the band fades away.
    await view.rerender(card('mid', undefined, BARE_ROOM));
    await settle();
    expect(getAnimatedStyle(screen.getByTestId('answer-card-band'))).toMatchObject({ opacity: 0 });
  });
});

// Partitions: at middle, a drag up and down within the content's range, then down past its top; a drag on the content
// while the card runs to its step; at low, a drag up on a content longer than what shows.
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

    // 50 scrolls the content back, the card comes 200 down, nearer low, and its run arrives there.
    await drag(250);
    await settle();
    expect(setLevel).toHaveBeenCalledWith('low');
  });

  // PR 545's review: a drag that only scrolled stopped the card's run part-way between two steps.
  it('leaves a card running to its step to arrive there when the drag only scrolls the content', async () => {
    const view = await render(card('low'));
    await layContent(1000);
    await settle();

    await view.rerender(card('mid'));
    await act(() => {
      jest.advanceTimersByTime(30);
    });
    await drag(-60);
    await settle();

    expect(shown()).toBe(MID);
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

// The user's phone check: a hairline parts the header, which stays, from the content that scrolls under it, as comment
// sheets do. Partitions: a content that shows something, scrolled or not; a content that shows nothing.
describe('the hairline under the header', () => {
  it('parts the header from the content, and stays while the content scrolls', async () => {
    await render(card('mid'));
    await layContent(1000);
    await settle();
    expect(screen.getByTestId('card-rule')).toHaveStyle({
      height: StyleSheet.hairlineWidth,
      backgroundColor: color.border,
    });

    await drag(-200);
    await settle();

    expect(screen.getByTestId('card-rule')).toBeOnTheScreen();
  });

  it('is not drawn over a content that shows nothing', async () => {
    await render(card('low'));
    await layContent(12);
    await settle();

    expect(screen.queryByTestId('card-rule')).toBeNull();
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

// PR 545's review: a let-go tells its step when the run arrives, and a render on the way, which still reads the step
// the drag began at, stopped the run where it began. Partitions: a let-go from middle to low, the card rendered again
// mid-run, then the step it tells given back as the parent would.
describe('a let-go run', () => {
  it('arrives at its step though the card renders again on the way', async () => {
    const setLevel = jest.fn<undefined, [Level]>();
    const view = await render(card('mid', setLevel));
    await layContent(1000);
    await settle();

    await drag(200);
    await view.rerender(card('mid', setLevel));
    await settle();
    expect(setLevel).toHaveBeenCalledWith('low');

    await view.rerender(card('low', setLevel));
    await settle();
    expect(shown()).toBe(LOW);
  });
});
