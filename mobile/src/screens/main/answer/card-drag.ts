/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  Gesture,
  type GestureTouchEvent,
  type GestureStateManager,
  type PanGesture,
} from 'react-native-gesture-handler';
import type Reanimated from 'react-native-reanimated';
import {
  type AnimatedRef,
  scrollTo,
  type SharedValue,
  useAnimatedReaction,
  useSharedValue,
  withDecay,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { FLING_SPEED, landingOf, type Level, type LevelHeights } from './card-levels';
import { SETTLE } from './card-run';

// The answer sheet's drag on the UI thread (moved out of `card-motion.ts` for its length, P04 ticket 61): anywhere on
// the card it moves the card between its steps, and at high it scrolls the content first. The content's scroll view
// takes no touch of its own: on Android a native view that takes the touch cancels every gesture, so the drag scrolls
// it, and a let-go runs it on with the finger's speed.

// A drag starts past this many points, so that a press stays a press.
const PAN_STARTS = 8;
// A drag sideways gives way to a row that scrolls sideways (the chips).
const SIDEWAYS = 16;
// Under this the content stands at its top.
const AT_TOP = 0.5;

// What a drag does, decided when it starts: moves the card, or leaves the content to scroll.
const CARD = 0;
const CONTENT = 1;

function clamp(value: number, low: number, high: number): number {
  'worklet';
  return Math.min(high, Math.max(low, value));
}

export interface PanParts {
  level: Level;
  heights: LevelHeights | null;
  room: number;
  offset: SharedValue<number>;
  drop: SharedValue<number>;
  // How far under low a let-go closes the answer: half of what shows of the low card over the footer.
  closeAt: number;
  closable: boolean;
  header: number;
  scroll: AnimatedRef<Reanimated.ScrollView>;
  scrollY: SharedValue<number>;
  // The content scrolls at the card's step now, as far as `maxScroll`, by the drag itself: the scroll view takes no touch
  // of its own, as a native view that takes the touch cancels every gesture on Android.
  scrolls: boolean;
  maxScroll: number;
  listY: SharedValue<number>;
  reduce: boolean;
  onPast: (past: boolean) => void;
  onClose: () => void;
  onLetGo: (to: Level, velocity: number) => void;
  // A let-go with no steps to run to (the stage not laid out): only the past hint goes.
  onStay: () => void;
}

interface PanState {
  // How much of the content showed when the drag started.
  from: SharedValue<number>;
  onHeader: SharedValue<boolean>;
  mode: SharedValue<number>;
  // Where the content was scrolled to when the drag started: it is held there while the card moves.
  listAt: SharedValue<number>;
  wasPast: SharedValue<boolean>;
  // Where the finger came down, and how far it had moved down when the drag took the touch, which decides whether the
  // drag is the card's or the content's.
  downX: SharedValue<number>;
  downY: SharedValue<number>;
  firstDy: SharedValue<number>;
}

function usePanState(): PanState {
  return {
    downX: useSharedValue(0),
    downY: useSharedValue(0),
    firstDy: useSharedValue(0),
    from: useSharedValue(0),
    onHeader: useSharedValue(false),
    mode: useSharedValue(CARD),
    listAt: useSharedValue(0),
    wasPast: useSharedValue(false),
  };
}

// How much of the content shows at the finger: what showed when the drag started, less the finger's way down.
function shownAt(heights: LevelHeights | null, state: PanState, translationY: number): number {
  'worklet';
  return heights === null ? -translationY : state.from.value - translationY;
}

// Where the drag's let-go lands, or that the answer closes, or that the card has no steps to land on.
function landOf(
  parts: PanParts,
  at: number,
  velocityY: number,
): { kind: 'close' } | { kind: 'stay' } | { kind: 'step'; to: Level } {
  'worklet';
  const { heights, closable, closeAt, level } = parts;
  if (heights === null) {
    const closes = closable && (-at > closeAt || (velocityY > FLING_SPEED && -at > 0));
    return closes ? { kind: 'close' } : { kind: 'stay' };
  }
  const to = landingOf({ start: level, at, velocity: velocityY, heights, closeAt, closable });
  return to === 'close' ? { kind: 'close' } : { kind: 'step', to };
}

// The card follows the finger between low and high; started at low, it goes on below low, and past the close point
// the hint says letting go closes the answer.
function moveCard(parts: PanParts, state: PanState, translationY: number): void {
  'worklet';
  const { heights, room, offset, drop, closable, closeAt, level, onPast } = parts;
  const at = shownAt(heights, state, translationY);
  if (heights !== null) {
    offset.value = room - clamp(at, heights.low, heights.high);
  }
  if (closable && level === 'low') {
    const below = Math.max(0, (heights?.low ?? 0) - at);
    drop.value = below;
    const past = below > closeAt;
    if (past !== state.wasPast.value) {
      state.wasPast.value = past;
      scheduleOnRN(onPast, past);
    }
  }
}

function release(parts: PanParts, state: PanState, translationY: number, velocityY: number): void {
  'worklet';
  const { drop, reduce, onClose, onStay, onLetGo } = parts;
  const land = landOf(parts, shownAt(parts.heights, state, translationY), velocityY);
  if (land.kind === 'close') {
    scheduleOnRN(onClose);
    return;
  }
  drop.value = reduce ? 0 : withSpring(0, { ...SETTLE, velocity: -velocityY });
  if (land.kind === 'stay') {
    scheduleOnRN(onStay);
  } else {
    scheduleOnRN(onLetGo, land.to, velocityY);
  }
}

// Whether a drag, `dy` down so far, scrolls the content rather than move the card: at high, started on the content,
// while it is scrolled or the finger moves up.
function listFirst(parts: PanParts, state: PanState, dy: number): boolean {
  'worklet';
  return parts.scrolls && !state.onHeader.value && (parts.scrollY.value > AT_TOP || dy < 0);
}

// The content follows the finger while it scrolls, and runs on with the let-go's speed.
function scrollContent(parts: PanParts, state: PanState, translationY: number): void {
  'worklet';
  parts.listY.value = clamp(state.listAt.value - translationY, 0, parts.maxScroll);
}

function letContentGo(parts: PanParts, velocityY: number): void {
  'worklet';
  parts.listY.value = withDecay({ velocity: -velocityY, clamp: [0, parts.maxScroll] });
}

// The drag takes the touch once the finger has moved PAN_STARTS up or down, and gives way sideways to a row that
// scrolls sideways.
function decide(state: PanState, { allTouches }: GestureTouchEvent, manager: GestureStateManager): void {
  'worklet';
  const [touch] = allTouches;
  if (touch === undefined) {
    return;
  }
  const dx = touch.absoluteX - state.downX.value;
  const dy = touch.absoluteY - state.downY.value;
  if (Math.abs(dx) > SIDEWAYS && Math.abs(dx) > Math.abs(dy)) {
    manager.fail();
  } else if (Math.abs(dy) >= PAN_STARTS) {
    state.firstDy.value = dy;
    manager.activate();
  }
}

// The card's drag on the UI thread, anywhere on the card. It takes the touch once the finger has moved PAN_STARTS up
// or down, and gives way sideways to a row that scrolls sideways. At high it scrolls the content first (`listFirst`);
// otherwise it moves the card.
export function usePan(parts: PanParts): PanGesture {
  const { heights, room, offset, header, scrollY, listY } = parts;
  const state = usePanState();
  return Gesture.Pan()
    .withTestId('answer-card-drag')
    .manualActivation(true)
    .onTouchesDown(({ allTouches }) => {
      'worklet';
      const [touch] = allTouches;
      if (touch !== undefined) {
        state.downX.value = touch.absoluteX;
        state.downY.value = touch.absoluteY;
        state.onHeader.value = touch.y < header;
      }
    })
    .onTouchesMove((event, manager) => {
      'worklet';
      decide(state, event, manager);
    })
    .onStart(({ translationY }) => {
      'worklet';
      state.from.value = heights === null ? 0 : room - offset.value;
      state.wasPast.value = false;
      // Where the content stands now, which also stops it running on from the last let-go.
      state.listAt.value = scrollY.value;
      listY.value = scrollY.value;
      // A drag the tests drive takes no touches: its first move says its way.
      const dy = state.firstDy.value === 0 ? translationY : state.firstDy.value;
      state.firstDy.value = 0;
      state.mode.value = listFirst(parts, state, dy) ? CONTENT : CARD;
    })
    .onUpdate(({ translationY }) => {
      'worklet';
      if (state.mode.value === CARD) {
        moveCard(parts, state, translationY);
      } else {
        scrollContent(parts, state, translationY);
      }
    })
    .onEnd(({ translationY, velocityY }) => {
      'worklet';
      if (state.mode.value === CARD) {
        release(parts, state, translationY, velocityY);
      } else {
        letContentGo(parts, velocityY);
      }
    });
}

// The content's scroll, written by the drag: each change scrolls the scroll view on the UI thread.
export function useListY(scroll: AnimatedRef<Reanimated.ScrollView>): SharedValue<number> {
  const listY = useSharedValue(0);
  useAnimatedReaction(
    () => listY.value,
    (y, last) => {
      if (last !== null && y !== last) {
        scrollTo(scroll, 0, y, false);
      }
    },
  );
  return listY;
}
