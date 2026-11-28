/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet, Text, type ViewStyle } from 'react-native';
import { getAnimatedStyle, makeMutable } from 'react-native-reanimated';
import { space } from '@/design-system';
import { listsTop } from '@/screens/main/layout';
import { foldedTimeCardOf } from '@/screens/main/answer/card-caps';
import { BAR_ADD_HEIGHT } from '@/screens/main/answer/condition-chips';
import type { Level } from '@/screens/main/answer/card-levels';
import { FrameCard } from '@/screens/main/answer/frame-card';
import { SheetLinkContext } from '@/screens/main/answer/sheet-link';
import { TUCK_STRIP } from '@/screens/main/answer/time-card-grip';
import type { TopStop, TopStops } from '@/screens/main/answer/top-stops';

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

function card({ stepsTop, skippedLine }: { stepsTop?: number; skippedLine?: boolean } = {}): React.ReactElement {
  return (
    <FrameCard
      barRoom={BAR_ROOM}
      onClose={jest.fn<undefined, []>()}
      onHeight={jest.fn<undefined, [number]>()}
      raising={{ level: 'high', setLevel: jest.fn<undefined, [Level]>(), close: jest.fn<undefined, []>() }}
      skippedLine={skippedLine}
      stageHeight={STAGE}
      stepsTop={stepsTop}
      testID="card"
    >
      <Text>둘 다 가까운 302동식당을 추천해요.</Text>
    </FrameCard>
  );
}

// High's height: as much of the scrolling part as shows, the card standing at high. The part is laid out at the most
// room any top leaves, and the card rests below its place by what high shows less.
function laid(): number {
  const content: unknown = screen.getByTestId('card-content').props.style;
  return Number(StyleSheet.flatten<ViewStyle>(Array.isArray(content) ? content : [content]).height);
}

function high(): number {
  const moved: unknown = getAnimatedStyle(screen.getByTestId('card'));
  const { transform } = StyleSheet.flatten<ViewStyle>(Array.isArray(moved) ? moved : [moved]);
  const shift: unknown = Array.isArray(transform) ? transform[0] : undefined;
  return laid() - (typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : 0);
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

// P01 ticket 45, the user's phone (2026-11-28): at each unfold of the time card the sheet's high stood for a quarter of
// a second under the top as it was before, then went down under the time card. High was measured from the height the top
// told, which reaches the sheet two renders after the stop, through an effect and the frame's state. It is measured from
// the top's cards as they are laid out, which the stops hold beside the stop itself. Partitions: each stop, the told
// height still the one of the stop before. Expected values: the steps card 120 high, the time card 100 folded under a gap
// of 8; at 2 high stands under both, at 1 under the steps card and the strip, at 0 under the strip at the stage's top.
const STEPS = 120;
const UNFOLDED = STEPS + space[2] + 100;

function stopsAt(stop: TopStop): TopStops {
  return {
    stop,
    setStop: jest.fn<undefined, [TopStop]>(),
    stepsHeight: STEPS,
    setStepsHeight: jest.fn<undefined, [number]>(),
    unfoldedHeight: UNFOLDED,
    setUnfoldedHeight: jest.fn<undefined, [number]>(),
    lift: makeMutable(0),
  };
}

describe('high under the bar of several requests, the moment the top folds or unfolds', () => {
  it.each([
    { stop: 2, toldBefore: STEPS + TUCK_STRIP, top: UNFOLDED },
    { stop: 1, toldBefore: UNFOLDED, top: STEPS + TUCK_STRIP },
    { stop: 0, toldBefore: STEPS + TUCK_STRIP, top: TUCK_STRIP - listsTop(0) },
  ] as const)(
    'stands under what stop $stop leaves, whatever the top told before',
    async ({ stop, toldBefore, top }) => {
      await render(
        <SheetLinkContext value={{ high: true, onOpen: jest.fn<undefined, []>(), top: stopsAt(stop) }}>
          {card({ stepsTop: toldBefore })}
        </SheetLinkContext>,
      );
      await act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(high()).toBe(STAGE - listsTop(0) - top - space[2] - BAR_ROOM);
    },
  );
});

// The same fault's class: whatever moved high laid the sheet out again, and at low or middle its top edge dipped for a
// frame. It is laid out at one height, the most room any top leaves. Partitions: one request, with and without the line
// of left-out Classes; several at each stop. Expected value: under the strip at the stage's top, and the gap.
describe('the scrolling part as laid out', () => {
  it.each([
    { top: 'one request', stop: null, skippedLine: false },
    { top: 'one request with the left-out Classes’ line', stop: null, skippedLine: true },
    { top: 'several requests at stop 2', stop: 2, skippedLine: false },
    { top: 'several requests at stop 1', stop: 1, skippedLine: false },
    { top: 'several requests at stop 0', stop: 0, skippedLine: false },
  ] as const)('is the same under $top', async ({ stop, skippedLine }) => {
    const shown =
      stop === null ? (
        card({ skippedLine })
      ) : (
        <SheetLinkContext value={{ high: true, onOpen: jest.fn<undefined, []>(), top: stopsAt(stop) }}>
          {card({ stepsTop: UNFOLDED })}
        </SheetLinkContext>
      );
    await render(shown);
    await act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(laid()).toBe(STAGE - TUCK_STRIP - space[2] - BAR_ROOM);
  });
});
