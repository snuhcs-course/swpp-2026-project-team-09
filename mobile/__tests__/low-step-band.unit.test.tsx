/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { getAnimatedStyle } from 'react-native-reanimated';
import { text } from '@/design-system';
import type { Level } from '@/screens/main/answer/card-levels';
import { FrameCard } from '@/screens/main/answer/frame-card';
import { EdgeText, EdgeView } from '@/screens/main/answer/row-edges';

// The low step's band over the footer ends the content on a row its parts tell (P01 ticket 32): a no-Plan meal's one
// line of words and its row of buttons under it. The line rule it replaces ended the content after two lines of 24,
// inside the buttons.
// Expected values: the content's top padding of 12; the words at 12–36 and the buttons at 48–88 in the content, so the
// content ends at the buttons' top, 48; buttons of 20 at 40–60 fit, and it ends under them, at 60.

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
const LINE = text.bodyLg.lineHeight;

// Where each part stands under the content's parts, as the layout would place it.
const PLACES: Record<string, { y: number; height: number }> = {
  words: { y: 0, height: LINE },
  buttons: { y: LINE + 12, height: 40 },
};

type Measure = (root: unknown, ok: (x: number, y: number, width: number, height: number) => void) => void;

function placed(this: { props: { testID?: string } }, _root: unknown, ok: Parameters<Measure>[1]): void {
  const place = PLACES[this.props.testID ?? ''];
  if (place !== undefined) {
    ok(0, place.y, 390, place.height);
  }
}

// The host views' measure, which places each part as `PLACES` has it, kept to be put back.
const KEPT = [View.prototype, Text.prototype].map((proto) => ({
  proto,
  measure: Object.getOwnPropertyDescriptor(proto, 'measureLayout'),
}));

beforeEach(() => {
  jest.useFakeTimers();
  for (const { proto } of KEPT) {
    Object.defineProperty(proto, 'measureLayout', { value: placed, configurable: true, writable: true });
  }
});

afterEach(() => {
  jest.useRealTimers();
  for (const { proto, measure } of KEPT) {
    if (measure === undefined) {
      Reflect.deleteProperty(proto, 'measureLayout');
    } else {
      Object.defineProperty(proto, 'measureLayout', measure);
    }
  }
});

function card(level: Level): React.ReactElement {
  return (
    <FrameCard
      barRoom={BAR_ROOM}
      onClose={jest.fn<undefined, []>()}
      onHeight={jest.fn<undefined, [number]>()}
      raising={{ level, setLevel: jest.fn<undefined, [Level]>(), close: jest.fn<undefined, []>() }}
      stageHeight={STAGE}
      testID="card"
    >
      <EdgeText style={{ lineHeight: LINE }} testID="words">
        지금은 셋이 먹을 때가 없어요
      </EdgeText>
      <EdgeView style={{ height: 40 }} testID="buttons" />
    </FrameCard>
  );
}

// The content laid out, taller than every step, and its parts placed.
async function layAll(): Promise<void> {
  await fireEvent(screen.getByTestId('card-parts', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 1000 } },
  });
  await lay('words');
  await lay('buttons');
}

async function lay(id: string): Promise<void> {
  const { y, height } = PLACES[id] ?? { y: 0, height: 0 };
  await fireEvent(screen.getByTestId(id), 'layout', { nativeEvent: { layout: { x: 0, y, width: 390, height } } });
}

function animated(id: string): ViewStyle {
  const style: unknown = getAnimatedStyle(screen.getByTestId(id));
  return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
}

// Where the content ends at low, from its top: low's height less the band over the footer. Low's height is the
// scrolling part's laid-out height less how far the card stands below its place.
function contentEnd(): number {
  const style: unknown = screen.getByTestId('card-content', { includeHiddenElements: true }).props.style;
  const room = Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).height);
  const { transform } = animated('card');
  const shift: unknown = Array.isArray(transform) ? transform[0] : undefined;
  const below = typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : 0;
  return room - below - Number(animated('answer-card-band').height);
}

async function settle(): Promise<void> {
  await act(() => {
    jest.advanceTimersByTime(1000);
  });
}

describe("the low step's band over a row of buttons", () => {
  it('ends the content over the buttons, not through them', async () => {
    await render(card('low'));
    await layAll();
    await settle();

    expect(contentEnd()).toBe(12 + LINE + 12);
  });

  it('shows the buttons whole once they fit', async () => {
    PLACES.buttons = { y: LINE + 4, height: 20 };
    await render(card('low'));
    await layAll();
    await settle();

    expect(contentEnd()).toBe(12 + LINE + 4 + 20);
    PLACES.buttons = { y: LINE + 12, height: 40 };
  });
});
