/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AccessibilityActionInfo, ViewStyle } from 'react-native';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReduceMotionSetting } from '@/hooks/use-reduce-motion';
import { CARRY_S, FLING_SPEED } from './card-levels';
import { SETTLE } from './card-run';
import { LONG_PULL } from './top-stops';
import { useFoldUnder, useFollowSheet } from './grip-sheet';
import type { SheetLink } from './sheet-link';

// The time card's grip (P04 ticket 61, boards k1–k4 and p): the card stands at one of its places, and a drag on its
// grip's strip, the card's whole width under its hairline, moves it between them with the finger. Pushed up it slides
// up as it is, nothing laid out again, until only a strip with the grip shows under the status bar (tucked). Pulled
// down it opens: a row for each person comes out under the track, which keeps its range and scale, the card growing
// with the rows; 나's alone when nobody is added (P04 ticket 64). A let-go settles at the place a fling points to, or
// the nearest. A press on the grip opens or folds the card, and a screen reader tucks it away or back. Only one of it
// and the answer sheet is expanded at a time (`sheet-link`).

// What of the card stays in sight tucked: the grip and a little room around it.
export const TUCK_STRIP = 20;
// The strip the grip lies in is 20 points high from the hairline to the card's edge, and takes a touch 24 points
// further down, over the map, so that it is 44 high; nothing above the hairline is covered: the track's drag, its
// handles, and the ends' labels, the day's other meal among them, keep their own touches.
export const STRIP_SLOP = { bottom: 24 };
// A drag starts past this many points, so that a press stays a press.
const PAN_STARTS = 8;

export const TUCK_LABEL = '시간 카드 접기';
export const UNTUCK_LABEL = '시간 카드 펴기';

export type GripPlace = 'tucked' | 'shown' | 'open';

export const PLACES: readonly GripPlace[] = ['tucked', 'shown', 'open'];

interface GripInput {
  // The card's height folded, and its top from the stage's top, which is under the status bar.
  height: number;
  top: number;
  // The rows for each person add this much to it open.
  rows: number;
  // The answer sheet under it: opening brings a high sheet down, and the sheet rising to high folds the card.
  sheet: SheetLink;
  // Pushed up to its strip, the card folds the top a stop instead of staying there (P01 ticket 22); `long`, a pull a
  // long way past it, folds two.
  fold?: (long: boolean) => void;
}

type Moved = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

export interface TimeCardGrip {
  place: GripPlace;
  // Moving now, by the finger or settling: the card's laid-out height then is not its own.
  moving: boolean;
  pan: PanGesture;
  // The card's translation, which the UI thread moves, then where it rests, which React holds so that a commit of
  // React's lays the right place again (as `useRun` does for the answer sheet).
  moved: Moved;
  rested: ViewStyle;
  // The rows' room, moved and resting.
  grown: Moved;
  grownRest: ViewStyle;
  toggle: () => void;
  // Settles the card at a place, as picking people does (P04 ticket 64).
  settleTo: (to: GripPlace) => void;
  // 1 while the card's open height follows the sheet's move (`sheet-link`): its laid-out height then is not its own.
  followsSheet: SharedValue<number>;
  // A screen reader's steps on the grip.
  actions: AccessibilityActionInfo[];
  onAction: (name: string) => void;
}

function clamp(value: number, low: number, high: number): number {
  'worklet';
  return Math.min(high, Math.max(low, value));
}

// Where a let-go settles among the places, lowest first: a fling at the next one its way, else the nearest to where
// its speed carries it.
export function gripLanding(at: number, velocity: number, stops: readonly number[]): number {
  'worklet';
  if (Math.abs(velocity) > FLING_SPEED) {
    if (velocity > 0) {
      const next = stops.findIndex((stop) => stop > at + 1);
      return next === -1 ? stops.length - 1 : next;
    }
    const before = stops.findLastIndex((stop) => stop < at - 1);
    return before === -1 ? 0 : before;
  }
  const carried = at + velocity * CARRY_S;
  let best = 0;
  stops.forEach((stop, index) => {
    if (Math.abs(stop - carried) < Math.abs((stops[best] ?? 0) - carried)) {
      best = index;
    }
  });
  return best;
}

// A pull a long way past the strip folds the top two stops (P01 ticket 22), instead of settling the card.
function foldsLong(foldLong: (() => void) | null, at: number, low: number): boolean {
  'worklet';
  if (foldLong === null || at >= low - LONG_PULL) {
    return false;
  }
  scheduleOnRN(foldLong);
  return true;
}

// A drag on the strip. One that starts with the sheet high and can open the card has the sheet follow it (`sheet-link`)
// until it is let go: let go open, the sheet's own run to middle takes it from where it stands.
function useGripPan(
  y: SharedValue<number>,
  stops: readonly number[],
  settle: (index: number, velocity: number) => void,
  { grab, sheet, foldLong }: { grab: () => void; sheet: SheetLink; foldLong: (() => void) | null },
): PanGesture {
  const from = useSharedValue(0);
  // A drag that began while the sheet's move leads is let pass: the card only follows then.
  const skip = useSharedValue(false);
  const low = stops[0] ?? 0;
  const high = stops.at(-1) ?? 0;
  const { following, sheetLeads } = sheet;
  const follows = sheet.high && stops.length > PLACES.indexOf('open');
  return Gesture.Pan()
    .withTestId('time-card-grip-drag')
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .hitSlop(STRIP_SLOP)
    .onStart(() => {
      'worklet';
      skip.value = sheetLeads?.value === 1;
      if (skip.value) {
        return;
      }
      from.value = y.value;
      if (following !== undefined) {
        following.value = follows ? 1 : 0;
      }
      scheduleOnRN(grab);
    })
    .onUpdate(({ translationY }) => {
      'worklet';
      if (!skip.value) {
        y.value = clamp(from.value + translationY, low, high);
      }
    })
    .onEnd(({ velocityY, translationY }) => {
      'worklet';
      if (skip.value || foldsLong(foldLong, from.value + translationY, low)) {
        return;
      }
      const to = gripLanding(y.value, velocityY, stops);
      // Let go open, the sheet's own run to middle takes it; let go short, it follows the card back until it is high.
      if (following !== undefined && following.value === 1) {
        following.value = PLACES[to] === 'open' || y.value <= 0 ? 0 : 2;
      }
      scheduleOnRN(settle, to, velocityY);
    });
}

function useGripStyles(
  y: SharedValue<number>,
  rows: number,
  pull?: SharedValue<number>,
): { moved: Moved; grown: Moved } {
  // How far the card is pulled open, for the sheet under it.
  useAnimatedReaction(
    () => (rows > 0 ? clamp(y.value / rows, 0, 1) : 0),
    (share) => {
      if (pull !== undefined) {
        pull.value = share;
      }
    },
    [rows, pull],
  );
  const moved = useAnimatedStyle<ViewStyle>(() => ({ transform: [{ translateY: Math.min(0, y.value) }] }));
  const grown = useAnimatedStyle<ViewStyle>(() => ({ height: clamp(y.value, 0, rows) }));
  return { moved, grown };
}

interface Settling {
  place: GripPlace;
  moving: boolean;
  // Where the card is going: the place a run heads for, else the one it rests at. A way back asked while it opens
  // (P04 ticket 67) is measured from where it goes, not from where it rested.
  aim: () => GripPlace;
  // The finger takes the card: a run on its way stops heading anywhere.
  grab: () => void;
  settle: (index: number, velocity?: number) => void;
}

interface Running {
  place: GripPlace;
  moving: boolean;
  setMoving: (moving: boolean) => void;
  // The index of the place a run heads for, until it arrives; null at rest and under the finger.
  heading: RefObject<number | null>;
  run: (index: number, velocity: number) => void;
}

// The run to the place a let-go or a press settles at.
function useRun(stops: readonly number[], y: SharedValue<number>, fold?: (long: boolean) => void): Running {
  const [place, setPlace] = useState<GripPlace>('shown');
  const [moving, setMoving] = useState(false);
  const heading = useRef<number | null>(null);
  const reduce = useReduceMotionSetting() !== false;
  const run = useCallback(
    (index: number, velocity: number): void => {
      const to = stops[index] ?? 0;
      heading.current = index;
      const done = (): void => {
        heading.current = null;
        setMoving(false);
        // Folding the top, the card goes behind what stays and stands at its place again for when it comes back.
        if (PLACES[index] === 'tucked' && fold !== undefined) {
          y.value = 0;
          setPlace('shown');
          fold(false);
          return;
        }
        setPlace(PLACES[index] ?? 'shown');
      };
      if (reduce) {
        y.value = to;
        done();
        return;
      }
      setMoving(true);
      y.value = withSpring(to, { ...SETTLE, velocity }, (finished) => {
        'worklet';
        if (finished === true) {
          scheduleOnRN(done);
        }
      });
    },
    [stops, reduce, y, fold],
  );
  return { place, moving, setMoving, heading, run };
}

// The card's place, and the run to the place a let-go or a press settles at. Laid out again at rest, as when the rows'
// height changes open, the card stays at its place; laid out again on its way, as picking's rows are a frame after the
// opening begins, the run heads for the new height (P04 ticket 67).
function useSettling(
  stops: readonly number[],
  y: SharedValue<number>,
  sheet: SheetLink,
  fold?: (long: boolean) => void,
): Settling {
  const { onOpen, following } = sheet;
  const { place, moving, setMoving, heading, run } = useRun(stops, y, fold);
  const settle = useCallback(
    (index: number, velocity = 0): void => {
      if (PLACES[index] === 'open') {
        if (following !== undefined) {
          following.value = 0;
        }
        onOpen();
      }
      run(index, velocity);
    },
    [run, onOpen, following],
  );
  const laid = useRef(stops);
  useEffect(() => {
    const changed = laid.current !== stops;
    laid.current = stops;
    if (changed && heading.current !== null) {
      run(heading.current, 0);
    } else if (!moving) {
      y.value = stops[PLACES.indexOf(place)] ?? 0;
    }
  }, [moving, place, stops, y, heading, run]);
  const aim = (): GripPlace => (heading.current === null ? place : (PLACES[heading.current] ?? place));
  const grab = useCallback((): void => {
    heading.current = null;
    setMoving(true);
  }, [heading, setMoving]);
  return { place, moving, aim, grab, settle };
}

export function useTimeCardGrip({ height, top, rows, sheet, fold }: GripInput): TimeCardGrip {
  // How far up the card goes: until its last TUCK_STRIP points stand at the stage's top, under the status bar.
  const reach = Math.max(0, top + height - TUCK_STRIP);
  const stops = useMemo(() => [-reach, 0, rows], [reach, rows]);
  const y = useSharedValue(0);
  const { place, moving, aim, grab, settle } = useSettling(stops, y, sheet, fold);
  useFoldUnder(sheet.high, place, settle);
  const followsSheet = useFollowSheet(y, rows, sheet, place);
  const foldLong = useMemo(
    () =>
      fold === undefined
        ? null
        : (): void => {
            fold(true);
          },
    [fold],
  );
  const pan = useGripPan(y, stops, settle, { grab, sheet, foldLong });
  const styles = useGripStyles(y, rows, sheet.pull);
  const rested = useMemo(() => ({ transform: [{ translateY: place === 'tucked' ? -reach : 0 }] }), [place, reach]);
  const grownRest = useMemo(() => ({ height: place === 'open' ? rows : 0 }), [place, rows]);
  return {
    place,
    moving,
    pan,
    rested,
    grownRest,
    ...styles,
    followsSheet,
    toggle: () => {
      settle(aim() === 'shown' ? 2 : 1);
    },
    settleTo: (to: GripPlace) => {
      if (to !== aim()) {
        settle(PLACES.indexOf(to));
      }
    },
    actions: [place === 'tucked' ? { name: 'untuck', label: UNTUCK_LABEL } : { name: 'tuck', label: TUCK_LABEL }],
    onAction: (name: string): void => {
      if (name === 'tuck' || name === 'untuck') {
        settle(name === 'tuck' ? 0 : 1);
      }
    },
  };
}
