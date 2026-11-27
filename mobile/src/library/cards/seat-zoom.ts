/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { SEAT_BOX, seatNumberSize } from './seats';

// The seat picture's zoom (P15 ticket 57; P01 ticket 01 of Iteration 5): its steps, the picture's size at a zoom, and
// where the view lands after a zoom so that the User keeps looking at the same place. The functions a gesture calls
// are worklets (P01 ticket 11).

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// The picture's height at zoom 1, as the frame draws it, and how far it zooms.
export const PICTURE_HEIGHT = 300;
export const ZOOM_MOST = 4;
// The zooms 확대 and 축소 step through.
const ZOOMS = [1, 1.5, 2, 3, ZOOM_MOST] as const;

export function zoomStepped(zoom: number, by: 1 | -1): number {
  const next = by === 1 ? ZOOMS.find((each) => each > zoom) : ZOOMS.findLast((each) => each < zoom);
  return next ?? zoom;
}

export function zoomWithin(zoom: number): number {
  'worklet';
  return Math.min(Math.max(zoom, 1), ZOOM_MOST);
}

export function pictureSize(image: Size, zoom: number): Size {
  'worklet';
  const height = PICTURE_HEIGHT * zoom;
  return { width: image.height > 0 ? (height * image.width) / image.height : 0, height };
}

function within(value: number, most: number): number {
  'worklet';
  return Math.min(Math.max(value, 0), Math.max(most, 0));
}

interface Zoomed {
  // A point of the picture as drawn at `from`.
  point: Point;
  // Where in the view that point should be after the zoom.
  at: Point;
  from: number;
  to: number;
  // The picture's size at `to`.
  picture: Size;
  view: Size;
}

// The scroll offsets after a zoom from `from` to `to` that put `point` at `at`, held within the picture's edges: the
// view's middle for 확대 and 축소, the picked seat brought to the middle, or the point between a pinch's fingers.
export function zoomedOffset({ point, at, from, to, picture, view }: Zoomed): Point {
  'worklet';
  const ratio = from > 0 ? to / from : 1;
  return {
    x: within(point.x * ratio - at.x, picture.width - view.width),
    y: within(point.y * ratio - at.y, picture.height - view.height),
  };
}

// The scroll offsets after one finger, or the two of a pinch together, moved the picture by `by` points (P01 ticket 11):
// the view moves the other way, held within the picture's edges.
export function pannedOffset({
  offset,
  by,
  picture,
  view,
}: {
  offset: Point;
  by: Point;
  picture: Size;
  view: Size;
}): Point {
  'worklet';
  return {
    x: within(offset.x - by.x, picture.width - view.width),
    y: within(offset.y - by.y, picture.height - view.height),
  };
}

// The furthest the view's offsets go on a picture of that size (P01 ticket 11).
export function offsetMost(picture: Size, view: Size): Point {
  'worklet';
  return { x: Math.max(picture.width - view.width, 0), y: Math.max(picture.height - view.height, 0) };
}

// The glide after a one-finger fling (P01 ticket 11): Reanimated's `withDecay` at this deceleration a millisecond, a
// short way, held at the picture's edges.
export const GLIDE_DECAY = 0.995;

// The seat layer is laid out once at the most zoom and scaled down to the zoom seen, so that the picture stays sharp
// and a pinch lays nothing out (P01 ticket 11).
export const LAYOUT_ZOOM = ZOOM_MOST;

// Whether a seat's number this many digits long fits its box whole at that zoom (`seatNumberSize`).
function fitsAt(image: Size, zoom: number, digits: number): boolean {
  const scale = image.width > 0 ? pictureSize(image, zoom).width / image.width : 0;
  return (
    seatNumberSize({ width: SEAT_BOX.width * scale, height: SEAT_BOX.height * scale }, '0'.repeat(digits)) !== null
  );
}

// The most digits a seat's number has that fit its box whole at that zoom: the seats whose numbers are that long or
// shorter show them; 0 for none.
export function digitsThatFit(image: Size, zoom: number): number {
  let digits = 0;
  while (digits < MOST_DIGITS && fitsAt(image, zoom, digits + 1)) {
    digits += 1;
  }
  return digits;
}

const MOST_DIGITS = 8;
// Steps of halving that find a threshold to well under a thousandth of a zoom.
const HALVINGS = 30;

// The zoom from which a number of each length shown fits its box whole, for the lengths the room's numbers have
// (P01 ticket 12): found once, so that a pinch only compares its zoom with them (`digitsAt`). A length that does not fit
// even at the most zoom has none.
export function digitThresholds(image: Size, lengths: readonly number[]): { digits: number; from: number }[] {
  return [...new Set(lengths)]
    .toSorted((one, other) => one - other)
    .flatMap((digits) => {
      if (!fitsAt(image, ZOOM_MOST, digits)) {
        return [];
      }
      let [low, high] = [1, ZOOM_MOST];
      if (fitsAt(image, low, digits)) {
        return [{ digits, from: low }];
      }
      for (let step = 0; step < HALVINGS; step += 1) {
        const middle = (low + high) / 2;
        [low, high] = fitsAt(image, middle, digits) ? [low, middle] : [middle, high];
      }
      return [{ digits, from: high }];
    });
}

// The most digits shown at that zoom, of the lengths the thresholds hold; 0 for none. A worklet: a pinch calls it at
// each step.
export function digitsAt(zoom: number, thresholds: readonly { digits: number; from: number }[]): number {
  'worklet';
  let digits = 0;
  for (const threshold of thresholds) {
    if (zoom >= threshold.from) {
      digits = Math.max(digits, threshold.digits);
    }
  }
  return digits;
}
