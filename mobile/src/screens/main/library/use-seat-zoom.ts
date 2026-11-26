/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  glideDistance,
  glideMs,
  pannedOffset,
  type Point,
  pictureSize,
  type Size,
  zoomedOffset,
  zoomStepped,
  zoomWithin,
} from '@/library/cards/seat-zoom';

// The seat picture's zoom and where the view stands on it (P01 ticket 01 of Iteration 5). 확대 and 축소 keep the
// middle of the view in the middle, or bring the picked seat there; a pinch keeps the point between the fingers where
// it is. The offsets and the view's size are kept in refs, since nothing is drawn from them. After a zoom the view is
// moved to the offsets `zoomedOffset` gives, once at once and again when each scroll view has grown, since a scroll view
// does not scroll past content it has not laid out yet. One finger moves the view by a pan beside the pinch, and the
// scroll views take no touch of their own: a scroll view that took a sideways move as its scroll made Android cancel
// the pinch, so a spread sideways or across barely zoomed (P01 ticket 11).

type Axis = 'x' | 'y';

export interface SeatZoom {
  zoom: number;
  // 확대 (1) or 축소 (-1).
  step: (by: 1 | -1) => void;
  // The pan of one finger, or of two together, and the pinch, at once.
  gesture: ReturnType<typeof Gesture.Simultaneous>;
  // The vertical scroll view and the horizontal one inside it.
  down: RefObject<ScrollView | null>;
  across: RefObject<ScrollView | null>;
  // The scroll views' events: where the view is, how large it is, and that the picture has grown to a new zoom.
  scrolled: (axis: Axis, at: number) => void;
  laidOut: (view: Size) => void;
  grown: (axis: Axis) => void;
}

interface Place {
  now: RefObject<number>;
  // The zoom when the running pinch began.
  pinchedFrom: RefObject<number>;
  offset: RefObject<Point>;
  view: RefObject<Size>;
  // The offsets the last zoom or move landed on, which a scroll view is sent to again once it has grown.
  pending: RefObject<Point | null>;
  // The running pan's translation at its last update, and whether two fingers were down in it.
  panned: RefObject<Point>;
  twoFingers: RefObject<boolean>;
  // The frame of the glide after a fling, while it runs.
  glide: RefObject<number | null>;
  down: RefObject<ScrollView | null>;
  across: RefObject<ScrollView | null>;
}

function scrollAxis(place: Place, axis: Axis): void {
  const to = place.pending.current;
  if (to === null) {
    return;
  }
  if (axis === 'x') {
    place.across.current?.scrollTo({ x: to.x, animated: false });
  } else {
    place.down.current?.scrollTo({ y: to.y, animated: false });
  }
}

// The view sent to `to` at once, on both axes.
function moveTo(place: Place, to: Point): void {
  place.offset.current = to;
  place.pending.current = to;
  scrollAxis(place, 'x');
  scrollAxis(place, 'y');
}

function stopGlide(place: Place): void {
  if (place.glide.current !== null) {
    cancelAnimationFrame(place.glide.current);
    place.glide.current = null;
  }
}

// After a one-finger fling the view glides on, slowing, held within the picture: frame by frame on this thread, as
// the pan moves the scroll views. A new touch, a pinch, or 확대 and 축소 stops it.
function glide(place: Place, image: Size, velocity: Point): void {
  stopGlide(place);
  const lasts = glideMs(velocity);
  if (lasts <= 0) {
    return;
  }
  const start = place.offset.current;
  const begun = Date.now();
  const frame = (): void => {
    const ms = Math.min(Date.now() - begun, lasts);
    const by = { x: glideDistance(velocity.x, ms), y: glideDistance(velocity.y, ms) };
    const picture = pictureSize(image, place.now.current);
    moveTo(place, pannedOffset({ offset: start, by, picture, view: place.view.current }));
    place.glide.current = ms < lasts ? requestAnimationFrame(frame) : null;
  };
  place.glide.current = requestAnimationFrame(frame);
}

type ZoomTo = (next: number, point: Point, at: Point) => void;

// The zoom, and a zoom to `next` that puts `point` (of the picture at the zoom now) at `at` (of the view).
function useZoomTo(image: Size | null, place: Place): { zoom: number; zoomTo: ZoomTo } {
  const [zoom, setZoom] = useState(1);
  const zoomTo = useCallback<ZoomTo>(
    (next, point, at) => {
      const from = place.now.current;
      const to = zoomWithin(next);
      if (image === null || to === from) {
        return;
      }
      const landed = zoomedOffset({ point, at, from, to, picture: pictureSize(image, to), view: place.view.current });
      place.now.current = to;
      place.offset.current = landed;
      place.pending.current = landed;
      setZoom(to);
    },
    [image, place],
  );
  useEffect(() => {
    scrollAxis(place, 'x');
    scrollAxis(place, 'y');
  }, [zoom, place]);
  return { zoom, zoomTo };
}

// react-native-gesture-handler gives a pinch's `scale` as the total since the fingers came down, so the zoom is the
// zoom at that moment times it. The zoom at that moment is kept with the place, since the gesture's callbacks may come
// from a later render than its start. Each update keeps the picture's point under the fingers where it is.
function usePinch(place: Place, zoomTo: ZoomTo): ReturnType<typeof Gesture.Pinch> {
  return useMemo(
    () =>
      Gesture.Pinch()
        .withTestId('seat-picker-pinch')
        .runOnJS(true)
        .onStart(() => {
          stopGlide(place);
          place.pinchedFrom.current = place.now.current;
        })
        .onUpdate(({ scale, focalX, focalY }) => {
          const at = { x: focalX, y: focalY };
          const { x, y } = place.offset.current;
          zoomTo(place.pinchedFrom.current * scale, { x: x + at.x, y: y + at.y }, at);
        }),
    [place, zoomTo],
  );
}

// react-native-gesture-handler gives a pan's translation as the total since it began, of the fingers' middle when two
// are down, so each update moves the view by the change since the last.
function usePan(image: Size | null, place: Place): ReturnType<typeof Gesture.Pan> {
  return useMemo(
    () =>
      Gesture.Pan()
        .withTestId('seat-picker-pan')
        .runOnJS(true)
        .averageTouches(true)
        .onBegin(() => {
          stopGlide(place);
        })
        .onStart(() => {
          place.panned.current = { x: 0, y: 0 };
          place.twoFingers.current = false;
        })
        .onUpdate(({ translationX, translationY, numberOfPointers }) => {
          const by = { x: translationX - place.panned.current.x, y: translationY - place.panned.current.y };
          place.panned.current = { x: translationX, y: translationY };
          place.twoFingers.current ||= numberOfPointers > 1;
          if (image === null) {
            return;
          }
          const picture = pictureSize(image, place.now.current);
          moveTo(place, pannedOffset({ offset: place.offset.current, by, picture, view: place.view.current }));
        })
        .onEnd(({ velocityX, velocityY }, success) => {
          if (success && image !== null && !place.twoFingers.current) {
            glide(place, image, { x: velocityX, y: velocityY });
          }
        }),
    [image, place],
  );
}

function usePlace(): Place {
  const now = useRef(1);
  const pinchedFrom = useRef(1);
  const offset = useRef<Point>({ x: 0, y: 0 });
  const view = useRef<Size>({ width: 0, height: 0 });
  const pending = useRef<Point | null>(null);
  const panned = useRef<Point>({ x: 0, y: 0 });
  const twoFingers = useRef(false);
  const glided = useRef<number | null>(null);
  const down = useRef<ScrollView>(null);
  const across = useRef<ScrollView>(null);
  return useMemo(
    () => ({ now, pinchedFrom, offset, view, pending, panned, twoFingers, glide: glided, down, across }),
    [],
  );
}

// `picked` gives the picked seat's middle in the picture at a zoom, or null when no seat is picked.
export function useSeatZoom(image: Size | null, picked: (zoom: number) => Point | null): SeatZoom {
  const place = usePlace();
  const { zoom, zoomTo } = useZoomTo(image, place);
  const pinch = usePinch(place, zoomTo);
  const pan = usePan(image, place);
  useEffect(
    () => (): void => {
      stopGlide(place);
    },
    [place],
  );
  const gesture = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);
  return {
    zoom,
    step: (by) => {
      stopGlide(place);
      const at = { x: place.view.current.width / 2, y: place.view.current.height / 2 };
      const { x, y } = place.offset.current;
      zoomTo(zoomStepped(place.now.current, by), picked(place.now.current) ?? { x: x + at.x, y: y + at.y }, at);
    },
    gesture,
    down: place.down,
    across: place.across,
    scrolled: (axis, at) => {
      place.offset.current = { ...place.offset.current, [axis]: at };
    },
    laidOut: (size) => {
      place.view.current = size;
    },
    grown: (axis) => {
      scrollAxis(place, axis);
    },
  };
}
