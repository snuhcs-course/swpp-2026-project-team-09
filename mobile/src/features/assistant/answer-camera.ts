/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import {
  CAMERA_BOUNDS,
  CAMPUS_BOUNDS,
  type FitPadding,
  inView,
  type MapCamera,
  MAX_ZOOM,
  MIN_ZOOM,
  project,
  type Size,
  unproject,
} from '@/map';
import { fit, settle } from '@/map/projection';

// What the pill and the card leave of the map, with the room for labels, in points of the map's view: each edge as a
// distance from the view's top or left.
export interface ViewArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Less than this is no move, and a point this near the area's edge is inside it: a fit rests in its last digits.
const ONE_POINT = 1;

// How far the box from `low` to `high` must move along an axis to lie in the area from `start` to `end`: centred
// when it fits or there is no pick, otherwise its edge on the pick's side on the area's edge on that side.
function shiftAlong(low: number, high: number, start: number, end: number, pick: number | null): number {
  if (high - low <= end - start || pick === null) {
    return (start + end) / 2 - (low + high) / 2;
  }
  return pick - low <= high - pick ? start - low : end - high;
}

// What the camera reads of a drawing: every point, the Plan's own points, and the picked Restaurant's.
interface Shown {
  points: readonly LatLng[];
  own: readonly LatLng[];
  pick: LatLng | null;
}

// Where the camera should go so that the Plan shows, or null when it may stay. When a point of the drawing lies
// outside the area, as on a map whose lowest zoom is too close for all of it, the Plan's own points are centred in
// the area, and when they do not fit either, the picked Restaurant's side is kept in view.
export function correctedCentre(drawing: Shown, camera: MapCamera, size: Size, area: ViewArea): LatLng | null {
  const place = (position: LatLng): { x: number; y: number } => inView(position, camera, size);
  const inside = drawing.points.every((position) => {
    const { x, y } = place(position);
    return (
      x >= area.left - ONE_POINT &&
      x <= area.right + ONE_POINT &&
      y >= area.top - ONE_POINT &&
      y <= area.bottom + ONE_POINT
    );
  });
  if (inside || drawing.own.length === 0) {
    return null;
  }
  const own = drawing.own.map(place);
  const pick = drawing.pick === null ? null : place(drawing.pick);
  const xs = own.map(({ x }) => x);
  const ys = own.map(({ y }) => y);
  const dx = shiftAlong(Math.min(...xs), Math.max(...xs), area.left, area.right, pick?.x ?? null);
  const dy = shiftAlong(Math.min(...ys), Math.max(...ys), area.top, area.bottom, pick?.y ?? null);
  if (Math.abs(dx) < ONE_POINT && Math.abs(dy) < ONE_POINT) {
    return null;
  }
  // The points move by the shift when the centre moves the other way.
  const centre = project(camera.centre, camera.zoom);
  return unproject({ x: centre.x - dx, y: centre.y - dy }, camera.zoom);
}

// Where the camera goes for an answer's drawing on a campus map whose view has that size: the fit of all its points
// into what the padding leaves, no closer than `closest`, and, where the map's lowest zoom is too close for all of
// them, moved at that zoom so that the Plan shows. Null for a drawing without points.
export function answerCamera(drawing: Shown, size: Size, padding: FitPadding, closest: number): MapCamera | null {
  const rules = { bounds: CAMERA_BOUNDS, fitBounds: CAMPUS_BOUNDS, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, size };
  const fitted = fit(drawing.points, { padding, maxZoom: closest }, rules);
  if (fitted === null) {
    return null;
  }
  const { top, right, bottom, left } = padding;
  const area = { top, right: size.width - right, bottom: size.height - bottom, left };
  const centre = correctedCentre(drawing, fitted, size, area);
  return centre === null ? fitted : settle({ centre, zoom: fitted.zoom }, rules);
}
