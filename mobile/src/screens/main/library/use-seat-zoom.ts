/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { type Point, pictureSize, type Size, zoomedOffset, zoomStepped, zoomWithin } from '@/library/cards/seat-zoom';

// The seat picture's zoom and where the view stands on it (P01 ticket 01 of Iteration 5). 확대 and 축소 keep the
// middle of the view in the middle, or bring the picked seat there; a pinch keeps the point between the fingers where
// it is. The offsets and the view's size are kept in refs, since nothing is drawn from them. After a zoom the view is
// moved to the offsets `zoomedOffset` gives, once at once and again when each scroll view has grown, since a scroll view
// does not scroll past content it has not laid out yet.

type Axis = 'x' | 'y';

export interface SeatZoom {
  zoom: number;
  // 확대 (1) or 축소 (-1).
  step: (by: 1 | -1) => void;
  pinch: ReturnType<typeof Gesture.Pinch>;
  // The vertical scroll view and the horizontal one inside it.
  down: RefObject<ScrollView | null>;
  across: RefObject<ScrollView | null>;
  // The scroll views' events: where the view is, how large it is, that the picture has grown to a new zoom, and that
  // the User took the view over.
  scrolled: (axis: Axis, at: number) => void;
  laidOut: (view: Size) => void;
  grown: (axis: Axis) => void;
  dragged: () => void;
}

interface Place {
  now: RefObject<number>;
  // The zoom when the running pinch began.
  pinchedFrom: RefObject<number>;
  offset: RefObject<Point>;
  view: RefObject<Size>;
  // The offsets the last zoom landed on, until the User drags.
  pending: RefObject<Point | null>;
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

function usePlace(): Place {
  const now = useRef(1);
  const pinchedFrom = useRef(1);
  const offset = useRef<Point>({ x: 0, y: 0 });
  const view = useRef<Size>({ width: 0, height: 0 });
  const pending = useRef<Point | null>(null);
  const down = useRef<ScrollView>(null);
  const across = useRef<ScrollView>(null);
  return useMemo(() => ({ now, pinchedFrom, offset, view, pending, down, across }), []);
}

// `picked` gives the picked seat's middle in the picture at a zoom, or null when no seat is picked.
export function useSeatZoom(image: Size | null, picked: (zoom: number) => Point | null): SeatZoom {
  const place = usePlace();
  const { zoom, zoomTo } = useZoomTo(image, place);
  const pinch = usePinch(place, zoomTo);
  return {
    zoom,
    step: (by) => {
      const at = { x: place.view.current.width / 2, y: place.view.current.height / 2 };
      const { x, y } = place.offset.current;
      zoomTo(zoomStepped(place.now.current, by), picked(place.now.current) ?? { x: x + at.x, y: y + at.y }, at);
    },
    pinch,
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
    dragged: () => {
      place.pending.current = null;
    },
  };
}
