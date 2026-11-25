/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AccessibilityActionInfo, ViewStyle } from 'react-native';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import { type SharedValue, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useReduceMotionSetting } from '@/hooks/use-reduce-motion';
import { CARRY_S, FLING_SPEED } from './card-levels';
import { SETTLE } from './card-run';

// The time card's grip (P04 ticket 61, boards k1–k4 and p): the card stands at one of its places, and a drag on its
// grip's strip, the card's whole width under its hairline, moves it between them with the finger. Pushed up it slides up as it
// is, nothing laid out again, until only a strip with the grip shows under the status bar (tucked). With Friends, pulled
// down it opens: a row for each person comes out under the track, which keeps its range and scale, the card growing
// with the rows. Alone there is nothing to open. A let-go settles at the place a fling points to, or the nearest. A
// press on the grip opens or folds the card with Friends, and a screen reader tucks it away or back.

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

const PLACES: readonly GripPlace[] = ['tucked', 'shown', 'open'];

interface GripInput {
  // The card's height folded, and its top from the stage's top, which is under the status bar.
  height: number;
  top: number;
  // With Friends it opens, and the rows for each person add this much to it open.
  opens: boolean;
  rows: number;
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

function useGripPan(
  y: SharedValue<number>,
  stops: readonly number[],
  settle: (index: number, velocity: number) => void,
  setMoving: (moving: boolean) => void,
): PanGesture {
  const from = useSharedValue(0);
  const low = stops[0] ?? 0;
  const high = stops.at(-1) ?? 0;
  return Gesture.Pan()
    .withTestId('time-card-grip-drag')
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .hitSlop(STRIP_SLOP)
    .onStart(() => {
      'worklet';
      from.value = y.value;
      scheduleOnRN(setMoving, true);
    })
    .onUpdate(({ translationY }) => {
      'worklet';
      y.value = clamp(from.value + translationY, low, high);
    })
    .onEnd(({ velocityY }) => {
      'worklet';
      scheduleOnRN(settle, gripLanding(y.value, velocityY, stops), velocityY);
    });
}

function useGripStyles(y: SharedValue<number>, rows: number): { moved: Moved; grown: Moved } {
  const moved = useAnimatedStyle<ViewStyle>(() => ({ transform: [{ translateY: Math.min(0, y.value) }] }));
  const grown = useAnimatedStyle<ViewStyle>(() => ({ height: clamp(y.value, 0, rows) }));
  return { moved, grown };
}

interface Settling {
  place: GripPlace;
  moving: boolean;
  setMoving: (moving: boolean) => void;
  settle: (index: number, velocity?: number) => void;
}

// The card's place, and the run to the place a let-go or a press settles at. Laid out again at rest, as when the rows'
// height changes open, the card stays at its place.
function useSettling(stops: readonly number[], y: SharedValue<number>): Settling {
  const [place, setPlace] = useState<GripPlace>('shown');
  const [moving, setMoving] = useState(false);
  const reduce = useReduceMotionSetting() !== false;
  const settle = useCallback(
    (index: number, velocity = 0): void => {
      const to = stops[index] ?? 0;
      const done = (): void => {
        setPlace(PLACES[index] ?? 'shown');
        setMoving(false);
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
    [stops, reduce, y],
  );
  useEffect(() => {
    if (!moving) {
      y.value = stops[PLACES.indexOf(place)] ?? 0;
    }
  }, [moving, place, stops, y]);
  return { place, moving, setMoving, settle };
}

export function useTimeCardGrip({ height, top, opens, rows }: GripInput): TimeCardGrip {
  // How far up the card goes: until its last TUCK_STRIP points stand at the stage's top, under the status bar.
  const reach = Math.max(0, top + height - TUCK_STRIP);
  const stops = useMemo(() => (opens ? [-reach, 0, rows] : [-reach, 0]), [reach, opens, rows]);
  const y = useSharedValue(0);
  const { place, moving, setMoving, settle } = useSettling(stops, y);
  const pan = useGripPan(y, stops, settle, setMoving);
  const styles = useGripStyles(y, rows);
  const rested = useMemo(() => ({ transform: [{ translateY: place === 'tucked' ? -reach : 0 }] }), [place, reach]);
  const grownRest = useMemo(() => ({ height: place === 'open' ? rows : 0 }), [place, rows]);
  return {
    place,
    moving,
    pan,
    rested,
    grownRest,
    ...styles,
    toggle: () => {
      if (opens) {
        settle(place === 'shown' ? 2 : 1);
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
