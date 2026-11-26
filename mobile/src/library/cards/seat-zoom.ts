/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The seat picture's zoom (P15 ticket 57; P01 ticket 01 of Iteration 5): its steps, the picture's size at a zoom, and
// where the view lands after a zoom so that the User keeps looking at the same place.

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
  return Math.min(Math.max(zoom, 1), ZOOM_MOST);
}

export function pictureSize(image: Size, zoom: number): Size {
  const height = PICTURE_HEIGHT * zoom;
  return { width: image.height > 0 ? (height * image.width) / image.height : 0, height };
}

function within(value: number, most: number): number {
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
  return {
    x: within(offset.x - by.x, picture.width - view.width),
    y: within(offset.y - by.y, picture.height - view.height),
  };
}

// A glide after a one-finger fling (P01 ticket 11), as Reanimated's `withDecay` moves: the speed falls by this share
// each millisecond, and the glide ends once it is below `GLIDE_LEAST` points a second.
const GLIDE_DECAY = 0.995;
const GLIDE_LEAST = 20;

// How far a glide at `velocity` points a second has gone after `ms`; at most `velocity` / 1000 / -ln(GLIDE_DECAY).
export function glideDistance(velocity: number, ms: number): number {
  return ((velocity / 1000) * (GLIDE_DECAY ** ms - 1)) / Math.log(GLIDE_DECAY);
}

// How long a glide at these velocities lasts, until both are below `GLIDE_LEAST`; 0 for a release without a fling.
export function glideMs({ x, y }: Point): number {
  const fastest = Math.max(Math.abs(x), Math.abs(y));
  return fastest <= GLIDE_LEAST ? 0 : Math.log(GLIDE_LEAST / fastest) / Math.log(GLIDE_DECAY);
}
