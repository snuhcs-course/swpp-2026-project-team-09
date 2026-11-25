/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
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
import { FLING_SPEED, heightOf, landingOf, type Level, type LevelHeights } from './card-levels';
import { SETTLE } from './card-run';

// The answer sheet's drag on the UI thread (moved out of `card-motion.ts` for its length, P04 ticket 61). On the header
// it moves the card between its steps. On the content it scrolls the content first, at every step, as far as the
// content has more than shows there; only at its ends does it move the card: down with the content at its top, up with
// it at its end or all of it shown. The content's scroll view takes no touch of its own: on Android a native view that
// takes the touch cancels every gesture, so the drag scrolls it, and a let-go runs it on with the finger's speed.

// A drag starts past this many points, so that a press stays a press.
const PAN_STARTS = 8;
// A drag sideways gives way to a row that scrolls sideways (the chips).
const SIDEWAYS = 16;

function clamp(value: number, low: number, high: number): number {
  'worklet';
  return Math.min(high, Math.max(low, value));
}

// How far the content scrolls with `shown` of it in sight: as far as lets its end come clear of the footer and its fade.
export function rangeAt(whole: number, shown: number): number {
  'worklet';
  return Math.max(0, whole - shown);
}

// How a move of the finger, `delta` down, is shared out on the content: back toward where the card started this drag,
// the card goes first; then the content scrolls as far as it can; what is left moves the card. `card` is how far down
// the card has moved this drag, `list` how far the content is scrolled, and `range` how far it scrolls.
export function shareMove(delta: number, card: number, list: number, range: number): { card: number; list: number } {
  'worklet';
  let rest = delta;
  let moved = card;
  if (moved * rest < 0) {
    const back = Math.sign(rest) * Math.min(Math.abs(rest), Math.abs(moved));
    moved += back;
    rest -= back;
  }
  const to = clamp(list - rest, 0, Math.max(list, range));
  return { card: moved + rest - (list - to), list: to };
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
  // The content's whole height with the fade's room under it, 0 until it is laid out: it scrolls by what it has more
  // than shows.
  whole: number;
  scrollY: SharedValue<number>;
  listY: SharedValue<number>;
  reduce: boolean;
  onPast: (past: boolean) => void;
  onClose: () => void;
  // A let-go landing on a step; `started` when its run up already began here, on the UI thread.
  onLetGo: (to: Level, velocity: number, started: boolean) => void;
  // That run's end.
  onLanded: (to: Level) => void;
  // A let-go with no steps to run to (the stage not laid out): only the past hint goes.
  onStay: () => void;
}

interface PanState {
  // How much of the content showed when the drag started.
  from: SharedValue<number>;
  onHeader: SharedValue<boolean>;
  wasPast: SharedValue<boolean>;
  // Where the finger came down. Once the drag has taken the touch, a move sideways no longer gives it away (PR 545's
  // review: the card let go under a finger that drifted sideways).
  downX: SharedValue<number>;
  downY: SharedValue<number>;
  active: SharedValue<boolean>;
  // The finger's way down at the last move, and how far down of it the card has gone.
  lastY: SharedValue<number>;
  cardY: SharedValue<number>;
  // The drag has moved the card: a drag that only scrolled the content leaves the card, and a run to its step, alone.
  took: SharedValue<boolean>;
}

function usePanState(): PanState {
  return {
    from: useSharedValue(0),
    onHeader: useSharedValue(false),
    wasPast: useSharedValue(false),
    downX: useSharedValue(0),
    downY: useSharedValue(0),
    active: useSharedValue(false),
    lastY: useSharedValue(0),
    cardY: useSharedValue(0),
    took: useSharedValue(false),
  };
}

// How much of the content shows with the card `cardY` down from where the drag started.
function shownAt(heights: LevelHeights | null, state: PanState, cardY: number): number {
  'worklet';
  return heights === null ? -cardY : state.from.value - cardY;
}

// Where the drag's let-go lands, or that the answer closes, or that the card has no steps to land on. A drag taken
// away from the finger (`closable` false) never closes.
function landOf(
  parts: PanParts,
  at: number,
  velocityY: number,
  closable: boolean,
): { kind: 'close' } | { kind: 'stay' } | { kind: 'step'; to: Level } {
  'worklet';
  const { heights, closeAt, level } = parts;
  if (heights === null) {
    const closes = closable && (-at > closeAt || (velocityY > FLING_SPEED && -at > 0));
    return closes ? { kind: 'close' } : { kind: 'stay' };
  }
  const to = landingOf({ start: level, at, velocity: velocityY, heights, closeAt, closable });
  return to === 'close' ? { kind: 'close' } : { kind: 'step', to };
}

// The card stands `cardY` down from where the drag started, between low and high; started at low, it goes on below
// low, and past the close point the hint says letting go closes the answer.
function moveCard(parts: PanParts, state: PanState, cardY: number): void {
  'worklet';
  const { heights, room, offset, drop, closable, closeAt, level, onPast } = parts;
  const at = shownAt(heights, state, cardY);
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

// The finger's move since the last: on the header the card takes it all; on the content it is shared out
// (`shareMove`). The card is taken only once a move reaches it, and then from where it stands, a run to its step under
// way included (PR 545's review: a drag that only scrolled stopped that run part-way). It stops at high, and at low
// unless it closes from there; raised, it shows more of the content, whose end then stays clear of the footer.
function follow(parts: PanParts, state: PanState, translationY: number): void {
  'worklet';
  const { heights, listY, whole } = parts;
  const delta = translationY - state.lastY.value;
  state.lastY.value = translationY;
  if (heights === null) {
    state.took.value = true;
    state.cardY.value = translationY;
    moveCard(parts, state, translationY);
    return;
  }
  const shared = state.onHeader.value
    ? { card: state.cardY.value + delta, list: listY.value }
    : shareMove(delta, state.cardY.value, listY.value, rangeAt(whole, state.from.value - state.cardY.value));
  if (!state.took.value && shared.card !== 0) {
    state.took.value = true;
    state.from.value = parts.room - parts.offset.value;
  }
  const from = state.from.value;
  const lowest = parts.closable && parts.level === 'low' ? Number.POSITIVE_INFINITY : from - heights.low;
  const cardY = clamp(shared.card, from - heights.high, lowest);
  state.cardY.value = cardY;
  if (state.took.value) {
    moveCard(parts, state, cardY);
  }
  listY.value = Math.min(shared.list, rangeAt(whole, from - cardY));
}

// A let-go that raises the card runs it to its step from this very frame, with the finger's speed, so that a toss
// neither stops for the frames a run started on the JS thread would wait nor kicks again when it starts (the user's
// phone check). A let-go that lowers it is run from the JS thread, which may first take a layer over the card away.
function runUp(parts: PanParts, to: Level, velocityY: number): boolean {
  'worklet';
  const { heights, room, offset, level, reduce, onLanded } = parts;
  if (reduce || heights === null || heightOf(to, heights) <= heightOf(level, heights)) {
    return false;
  }
  const target = room - heightOf(to, heights);
  const toward = (target - offset.value) * velocityY > 0 ? velocityY : 0;
  offset.value = withSpring(target, { ...SETTLE, velocity: toward }, (finished) => {
    'worklet';
    if (finished === true) {
      scheduleOnRN(onLanded, to);
    }
  });
  return true;
}

function release(parts: PanParts, state: PanState, velocityY: number, closable: boolean): void {
  'worklet';
  const { drop, reduce, onClose, onStay, onLetGo } = parts;
  const at = shownAt(parts.heights, state, state.cardY.value);
  const land = landOf(parts, at, velocityY, parts.closable && closable);
  if (land.kind === 'close') {
    scheduleOnRN(onClose);
    return;
  }
  // Only a card dragged below low has a drop to take back, and it goes back up from where it is: started with a speed
  // away from 0, as a toss up gave it, it dipped tens of points while the card rose.
  drop.value = reduce || drop.value <= 0 ? 0 : withSpring(0, { ...SETTLE, velocity: Math.min(0, velocityY) });
  if (land.kind === 'stay') {
    scheduleOnRN(onStay);
  } else {
    scheduleOnRN(onLetGo, land.to, velocityY, runUp(parts, land.to, velocityY));
  }
}

// A let-go of the content alone runs it on with the finger's speed, within its range at the card's step.
function letContentGo(parts: PanParts, velocityY: number): void {
  'worklet';
  const { heights, room, offset, listY, whole } = parts;
  const range = heights === null ? 0 : rangeAt(whole, room - offset.value);
  listY.value = withDecay({ velocity: -velocityY, clamp: [0, Math.max(range, listY.value)] });
}

// Until it has taken the touch, the drag takes it once the finger has moved PAN_STARTS up or down, and gives way
// sideways to a row that scrolls sideways.
function decide(state: PanState, { allTouches }: GestureTouchEvent, manager: GestureStateManager): void {
  'worklet';
  const [touch] = allTouches;
  if (touch === undefined || state.active.value) {
    return;
  }
  const dx = touch.absoluteX - state.downX.value;
  const dy = touch.absoluteY - state.downY.value;
  if (Math.abs(dx) > SIDEWAYS && Math.abs(dx) > Math.abs(dy)) {
    manager.fail();
  } else if (Math.abs(dy) >= PAN_STARTS) {
    state.active.value = true;
    manager.activate();
  }
}

// The card's drag on the UI thread, anywhere on the card (`follow`). A let-go after the card moved lands on a step or
// closes the answer; after the content alone scrolled, the content runs on and the card is left as it was. A drag taken away from the finger lands
// without closing.
export function usePan(parts: PanParts): PanGesture {
  const { heights, room, offset, header, scrollY, listY } = parts;
  const state = usePanState();
  return Gesture.Pan()
    .withTestId('answer-card-drag')
    .manualActivation(true)
    .onTouchesDown(({ allTouches }) => {
      'worklet';
      const [touch] = allTouches;
      if (touch !== undefined && !state.active.value) {
        state.downX.value = touch.absoluteX;
        state.downY.value = touch.absoluteY;
        state.onHeader.value = touch.y < header;
      }
    })
    .onTouchesMove((event, manager) => {
      'worklet';
      decide(state, event, manager);
    })
    .onStart(() => {
      'worklet';
      state.from.value = heights === null ? 0 : room - offset.value;
      state.wasPast.value = false;
      state.lastY.value = 0;
      state.cardY.value = 0;
      state.took.value = false;
      // Where the content stands now, which also stops it running on from the last let-go.
      listY.value = scrollY.value;
    })
    .onUpdate(({ translationY }) => {
      'worklet';
      follow(parts, state, translationY);
    })
    .onEnd(({ velocityY }, success) => {
      'worklet';
      if (state.took.value || state.onHeader.value) {
        release(parts, state, velocityY, success);
      } else {
        letContentGo(parts, velocityY);
      }
    })
    .onFinalize(() => {
      'worklet';
      state.active.value = false;
    });
}

// The content's scroll, written by the drag: each change scrolls the scroll view on the UI thread, and is where the
// content stands from then on.
export function useListY(
  scroll: AnimatedRef<Reanimated.ScrollView>,
  scrollY: SharedValue<number>,
): SharedValue<number> {
  const listY = useSharedValue(0);
  useAnimatedReaction(
    () => listY.value,
    (y, last) => {
      if (last !== null && y !== last) {
        scrollTo(scroll, 0, y, false);
        scrollY.value = y;
      }
    },
  );
  return listY;
}
