/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RefObject, useCallback, useMemo, useRef, useState } from 'react';
import type { ViewStyle } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';
import {
  digitsAt,
  digitThresholds,
  GLIDE_DECAY,
  LAYOUT_ZOOM,
  offsetMost,
  pannedOffset,
  type Point,
  pictureSize,
  type Size,
  zoomedOffset,
  zoomStepped,
  zoomWithin,
} from '@/library/cards/seat-zoom';

// The seat picture's zoom and where the view stands on it (P01 tickets 01 and 11 of Iteration 5). The seat layer is
// laid out once at the most zoom; its scale and its offsets are shared values that the gestures change on the UI
// thread, so that nothing crosses to the JS thread and nothing is laid out while the fingers move. One finger moves the
// view, two zoom it about the point between them and move it as they move, a fling glides on to the picture's edges,
// and 확대 and 축소 keep the middle of the view in the middle, or bring the picked seat there. The zoom seen is handed to
// React only when a gesture ends, for the buttons; the most digits of a seat's number that fit reach it once each time
// the zoom crosses where they change, during a pinch too, for the seats' numbers (P01 ticket 12).

export interface SeatZoom {
  // The zoom once the last gesture or button ended.
  zoom: number;
  // The most digits of a seat's number that fit at the zoom seen, of the lengths the room's numbers have.
  digits: number;
  // 확대 (1) or 축소 (-1).
  step: (by: 1 | -1) => void;
  // The pan of one finger, or of two together, and the pinch, at once.
  gesture: ReturnType<typeof Gesture.Simultaneous>;
  // The seat layer's move and scale.
  style: ReturnType<typeof useAnimatedStyle<ViewStyle>>;
  // The view's size, once laid out.
  laidOut: (view: Size) => void;
}

// Where the view stands: the zoom, and the offsets of the picture at that zoom at the view's top left.
interface Place {
  zoom: SharedValue<number>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  view: SharedValue<Size>;
}

const STEP_MS = 200;

function usePlace(): Place {
  const zoom = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const view = useSharedValue<Size>({ width: 0, height: 0 });
  return useMemo(() => ({ zoom, x, y, view }), [zoom, x, y, view]);
}

function stop({ zoom, x, y }: Place): void {
  'worklet';
  cancelAnimation(zoom);
  cancelAnimation(x);
  cancelAnimation(y);
}

// react-native-gesture-handler gives a pinch's `scale` as the total since the fingers came down, so the zoom is the zoom
// at that moment times it. Each update keeps the picture's point under the fingers where it is.
// The seats' numbers change while the fingers move: once each time the zoom crosses where the digits that fit change,
// never at each step, so that the seats are drawn again at most once a crossing.
interface Digits {
  thresholds: readonly { digits: number; from: number }[];
  shown: SharedValue<number>;
  show: (digits: number) => void;
}

function usePinch(
  image: Size | null,
  place: Place,
  { settle, digits }: { settle: (zoom: number) => void; digits: Digits },
): ReturnType<typeof Gesture.Pinch> {
  const from = useSharedValue(1);
  return useMemo(
    () =>
      Gesture.Pinch()
        .withTestId('seat-picker-pinch')
        .onStart(() => {
          stop(place);
          from.value = place.zoom.value;
        })
        .onUpdate(({ scale, focalX, focalY }) => {
          const now = place.zoom.value;
          const next = zoomWithin(from.value * scale);
          if (image === null || next === now) {
            return;
          }
          const at = { x: focalX, y: focalY };
          const point = { x: place.x.value + at.x, y: place.y.value + at.y };
          const picture = pictureSize(image, next);
          const landed = zoomedOffset({ point, at, from: now, to: next, picture, view: place.view.value });
          place.zoom.value = next;
          place.x.value = landed.x;
          place.y.value = landed.y;
          const fit = digitsAt(next, digits.thresholds);
          if (fit !== digits.shown.value) {
            digits.shown.value = fit;
            scheduleOnRN(digits.show, fit);
          }
        })
        .onEnd(() => {
          scheduleOnRN(settle, place.zoom.value);
        }),
    [image, place, from, settle, digits],
  );
}

// react-native-gesture-handler gives a pan's translation as the total since it began, of the fingers' middle when two
// are down, so each update moves the view by the change since the last. A touch stops a glide; a one-finger fling
// glides on.
function usePan(image: Size | null, place: Place): ReturnType<typeof Gesture.Pan> {
  const last = useSharedValue<Point>({ x: 0, y: 0 });
  const twoFingers = useSharedValue(false);
  return useMemo(
    () =>
      Gesture.Pan()
        .withTestId('seat-picker-pan')
        .averageTouches(true)
        .onBegin(() => {
          stop(place);
        })
        .onStart(() => {
          last.value = { x: 0, y: 0 };
          twoFingers.value = false;
        })
        .onUpdate(({ translationX, translationY, numberOfPointers }) => {
          const by = { x: translationX - last.value.x, y: translationY - last.value.y };
          last.value = { x: translationX, y: translationY };
          if (numberOfPointers > 1) {
            twoFingers.value = true;
          }
          if (image === null) {
            return;
          }
          const offset = { x: place.x.value, y: place.y.value };
          const picture = pictureSize(image, place.zoom.value);
          const moved = pannedOffset({ offset, by, picture, view: place.view.value });
          place.x.value = moved.x;
          place.y.value = moved.y;
        })
        .onEnd(({ velocityX, velocityY }, success) => {
          if (!success || twoFingers.value || image === null) {
            return;
          }
          const most = offsetMost(pictureSize(image, place.zoom.value), place.view.value);
          if (most.x > 0) {
            place.x.value = withDecay({ velocity: -velocityX, clamp: [0, most.x], deceleration: GLIDE_DECAY });
          }
          if (most.y > 0) {
            place.y.value = withDecay({ velocity: -velocityY, clamp: [0, most.y], deceleration: GLIDE_DECAY });
          }
        }),
    [image, place, last, twoFingers],
  );
}

// 확대 and 축소: to the next zoom after the one last aimed at (`aimed`), so that quick presses during a move each take a
// step, the picked seat or the view's middle brought to the middle, in a short move when the phone allows motion.
function useStep(
  image: Size | null,
  place: Place,
  picked: (zoom: number) => Point | null,
  { aimed, settle }: { aimed: RefObject<number>; settle: (zoom: number) => void },
): (by: 1 | -1) => void {
  const motion = useMotionAllowed();
  const moved = (value: number): number => (motion ? withTiming(value, { duration: STEP_MS }) : value);
  return (by) => {
    const from = place.zoom.value;
    const to = zoomStepped(aimed.current, by);
    if (image === null || to === aimed.current) {
      return;
    }
    const view = place.view.value;
    const at = { x: view.width / 2, y: view.height / 2 };
    const point = picked(from) ?? { x: place.x.value + at.x, y: place.y.value + at.y };
    const landed = zoomedOffset({ point, at, from, to, picture: pictureSize(image, to), view });
    stop(place);
    place.zoom.value = moved(to);
    place.x.value = moved(landed.x);
    place.y.value = moved(landed.y);
    settle(to);
  };
}

// The numbers' digits that fit, a shared value the pinch reads and React's copy of it.
function useDigits(image: Size | null, lengths: readonly number[]): Digits & { digits: number } {
  const key = [...new Set(lengths)].join(',');
  const thresholds = useMemo(
    () => (image === null ? [] : digitThresholds(image, key === '' ? [] : key.split(',').map(Number))),
    [image, key],
  );
  const [digits, setDigits] = useState(() => digitsAt(1, thresholds));
  const shown = useSharedValue(digits);
  const show = useCallback((fit: number) => {
    setDigits(fit);
  }, []);
  return useMemo(() => ({ thresholds, shown, show, digits }), [thresholds, shown, show, digits]);
}

// `picked` gives the picked seat's middle in the picture at a zoom, or null when no seat is picked; `lengths`, the
// lengths of the room's seat numbers.
export function useSeatZoom(
  image: Size | null,
  picked: (zoom: number) => Point | null,
  lengths: readonly number[] = [],
): SeatZoom {
  const place = usePlace();
  const [zoom, setZoom] = useState(1);
  const aimed = useRef(1);
  const digits = useDigits(image, lengths);
  const { thresholds, shown, show } = digits;
  const settle = useCallback(
    (settled: number) => {
      aimed.current = settled;
      setZoom(settled);
      const fit = digitsAt(settled, thresholds);
      shown.value = fit;
      show(fit);
    },
    [thresholds, shown, show],
  );
  const pinch = usePinch(image, place, { settle, digits });
  const pan = usePan(image, place);
  const gesture = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);
  const style = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: -place.x.value },
      { translateY: -place.y.value },
      { scale: place.zoom.value / LAYOUT_ZOOM },
    ],
  }));
  return {
    zoom,
    digits: digits.digits,
    step: useStep(image, place, picked, { aimed, settle }),
    gesture,
    style,
    laidOut: (view) => {
      place.view.value = view;
    },
  };
}
