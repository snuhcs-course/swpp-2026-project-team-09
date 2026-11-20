/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
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
