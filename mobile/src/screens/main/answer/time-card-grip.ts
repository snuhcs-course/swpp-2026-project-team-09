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
import { type SharedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { space } from '@/design-system';
import { useReduceMotionSetting } from '@/hooks/use-reduce-motion';
import { CARRY_S, FLING_SPEED } from './card-levels';
import { SETTLE } from './card-run';
import {
  type GripPlace,
  placeOfStop,
  placesOf,
  pressedPlace,
  readerActions,
  readerPlace,
  stopOfPlace,
} from './grip-places';
import { type Moved, useFoldUnder, useFollowSheet, useGripStyles, useLift } from './grip-sheet';
import type { SheetLink } from './sheet-link';
import type { TopStops } from './top-stops';

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

export type { GripPlace } from './grip-places';

interface GripInput {
  // The card's height folded, and its top from the stage's top, which is under the status bar.
  height: number;
  top: number;
  // The rows for each person add this much to it open.
  rows: number;
  // The answer sheet under it: opening brings a high sheet down, and the sheet rising to high folds the card.
  sheet: SheetLink;
  // Under the bar of several requests (P01 ticket 22): the top's stops, which the card's place tells and starts from,
  // and the bar's lift, which the card moves on the UI thread once it is pushed past its place behind the bar.
  under?: TopStops;
}

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

// A drag on the strip. One that starts with the sheet high and can open the card has the sheet follow it (`sheet-link`)
// until it is let go: let go open, the sheet's own run to middle takes it from where it stands. Under the bar of several
// requests one drag goes through every place in turn, the bar going up with the card past its place behind it.
function useGripPan(
  y: SharedValue<number>,
  stops: readonly number[],
  settle: (index: number, velocity: number) => void,
  { grab, sheet, open }: { grab: () => void; sheet: SheetLink; open: number },
): PanGesture {
  const from = useSharedValue(0);
  // A drag that began while the sheet's move leads is let pass: the card only follows then.
  const skip = useSharedValue(false);
  const low = stops[0] ?? 0;
  const high = stops.at(-1) ?? 0;
  const { following, sheetLeads } = sheet;
  const follows = sheet.high && stops.length > open;
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
    .onEnd(({ velocityY }) => {
      'worklet';
      if (skip.value) {
        return;
      }
      const to = gripLanding(y.value, velocityY, stops);
      // Let go open, the sheet's own run to middle takes it; let go short, it follows the card back until it is high.
      if (following !== undefined && following.value === 1) {
        following.value = to === open || y.value <= 0 ? 0 : 2;
      }
      scheduleOnRN(settle, to, velocityY);
    });
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

// Which places the card has, and the top's stops it tells under the bar of several requests.
interface Placing {
  places: readonly GripPlace[];
  under?: TopStops;
}

// The run to the place a let-go or a press settles at. Under the bar of several requests the place it arrives at is the
// top's stop, and the place it starts at is the stop's (P01 ticket 22): the card stays mounted and stops short, so there
// is never a second shape to swap in.
function useRun(stops: readonly number[], y: SharedValue<number>, { places, under }: Placing): Running {
  const [place, setPlace] = useState<GripPlace>(() => (under === undefined ? 'shown' : placeOfStop(under.stop)));
  const [moving, setMoving] = useState(false);
  const heading = useRef<number | null>(null);
  const reduce = useReduceMotionSetting() !== false;
  const setStop = under?.setStop;
  const run = useCallback(
    (index: number, velocity: number): void => {
      const to = stops[index] ?? 0;
      heading.current = index;
      const done = (): void => {
        heading.current = null;
        setMoving(false);
        const arrived = places[index] ?? 'shown';
        setPlace(arrived);
        setStop?.(stopOfPlace(arrived));
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
    [stops, reduce, y, places, setStop],
  );
  return { place, moving, setMoving, heading, run };
}

// The card's place, and the run to the place a let-go or a press settles at. Laid out again at rest, as when the rows'
// height changes open, the card stays at its place; laid out again on its way, as picking's rows are a frame after the
// opening begins, the run heads for the new height (P04 ticket 67).
function useSettling(stops: readonly number[], y: SharedValue<number>, sheet: SheetLink, placing: Placing): Settling {
  const { onOpen, following } = sheet;
  const { places } = placing;
  const { place, moving, setMoving, heading, run } = useRun(stops, y, placing);
  const settle = useCallback(
    (index: number, velocity = 0): void => {
      if (places[index] === 'open') {
        if (following !== undefined) {
          following.value = 0;
        }
        onOpen();
      }
      run(index, velocity);
    },
    [run, onOpen, following, places],
  );
  const laid = useRef(stops);
  useEffect(() => {
    const changed = laid.current !== stops;
    laid.current = stops;
    if (changed && heading.current !== null) {
      run(heading.current, 0);
    } else if (!moving) {
      y.value = stops[places.indexOf(place)] ?? 0;
    }
  }, [moving, place, stops, y, heading, run, places]);
  const aim = (): GripPlace => (heading.current === null ? place : (places[heading.current] ?? place));
  const grab = useCallback((): void => {
    heading.current = null;
    setMoving(true);
  }, [heading, setMoving]);
  return { place, moving, aim, grab, settle };
}

// Each place's translation, lowest first. Tucked, the card goes up until its last TUCK_STRIP points stand at the
// stage's top, under the status bar; behind the bar of several requests, until they stand under the bar's bottom edge,
// the gap over the card (`StepsTop`) above them.
function useStops(
  places: readonly GripPlace[],
  { height, top, rows }: Pick<GripInput, 'height' | 'top' | 'rows'>,
): { stops: readonly number[]; behind: number } {
  const reach = Math.max(0, top + height - TUCK_STRIP);
  const behind = Math.max(0, space[2] + height - TUCK_STRIP);
  const stops = useMemo(
    () => places.map((place) => ({ tucked: -reach, behind: -behind, shown: 0, open: rows })[place]),
    [places, reach, behind, rows],
  );
  return { stops, behind };
}

// Where the card rests, which React holds so that a commit of React's lays it there again. Under the bar of several
// requests, past its place behind the bar it rests there in its frame, which the bar's lift takes up (`TimeCard`). A
// card that starts folded, as when it comes back for a step at stop 0 or 1, is drawn only once its height is known: in
// the same commit as the place that height gives it, so that it never shows a frame at its unfolded place.
function restedAt(at: number, { behind, drawn }: { behind: number | null; drawn: boolean }): ViewStyle {
  return {
    transform: [{ translateY: behind === null ? Math.min(0, at) : Math.max(Math.min(0, at), -behind) }],
    opacity: drawn ? 1 : 0,
  };
}

export function useTimeCardGrip({ height, top, rows, sheet, under }: GripInput): TimeCardGrip {
  const alone = under === undefined;
  const places = useMemo(() => placesOf(!alone), [alone]);
  const { stops, behind } = useStops(places, { height, top, rows });
  const start = alone ? 'shown' : placeOfStop(under.stop);
  const y = useSharedValue(stops[places.indexOf(start)] ?? 0);
  const placing = useMemo(() => ({ places, under }), [places, under]);
  const { place, moving, aim, grab, settle } = useSettling(stops, y, sheet, placing);
  const settleTo = (to: GripPlace): void => {
    if (to !== aim() && places.includes(to)) {
      settle(places.indexOf(to));
    }
  };
  useFoldUnder(sheet.high, place, settleTo, !alone);
  useLift(y, behind, height > 0, under);
  const followsSheet = useFollowSheet(y, rows, sheet, place);
  const pan = useGripPan(y, stops, settle, { grab, sheet, open: places.indexOf('open') });
  const styles = useGripStyles(y, rows, { pull: sheet.pull, behind: alone ? null : behind });
  const rested = useMemo(
    () =>
      restedAt(stops[places.indexOf(place)] ?? 0, {
        behind: alone ? null : behind,
        drawn: height > 0 || place === 'shown' || place === 'open',
      }),
    [stops, places, place, alone, behind, height],
  );
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
      settleTo(pressedPlace(aim(), !alone));
    },
    settleTo,
    actions: readerActions(place, !alone),
    onAction: (name: string): void => {
      if (name === 'tuck' || name === 'untuck') {
        settleTo(readerPlace(name, place, !alone));
      }
    },
  };
}
