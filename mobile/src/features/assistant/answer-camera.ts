/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
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
import { fit, outerRules, settle } from '@/map/projection';
import { ANSWER_SYMBOL_BOX, answerLabelBox } from '@/design-system';
import { type AnswerDrawing, offset } from './answer-drawing';
import { inside, type LabelView, ONE_POINT } from './answer-labels';

// What the pill and the card leave of the map, with the room for labels, in points of the map's view: each edge as a
// distance from the view's top or left.
export interface ViewArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// More ground a point than a campus map shows on any phone, so that a room is never too small.
const METRES_PER_POINT = 4.5;
// Half the symbol box and a margin of 6.
const LEAST_ROOM = ANSWER_SYMBOL_BOX / 2 + 6;

// The room a mark needs on one side of its point: half its symbol box, or its label's box when the label is there.
function needOn(side: 'above' | 'below', { look }: AnswerDrawing['things'][number]): number {
  const label = look.kind === 'answer' ? look.label : null;
  if (label?.side !== side) {
    return ANSWER_SYMBOL_BOX / 2;
  }
  const box = answerLabelBox(label);
  return side === 'above' ? -box.top : box.bottom;
}

// The room the marks of a drawing need above its top-most point and below its bottom-most, in points: a mark that
// stands south of the top-most point needs that much less above, and one north of the bottom-most that much less
// below; at least `LEAST_ROOM` each.
export function roomsOf({ things, points }: Pick<AnswerDrawing, 'things' | 'points'>): {
  above: number;
  below: number;
} {
  const latitudes = points.map(({ latitude }) => latitude);
  const top = Math.max(...latitudes);
  const bottom = Math.min(...latitudes);
  const room = (side: 'above' | 'below', edge: number): number =>
    Math.max(
      LEAST_ROOM,
      ...things.map((thing) => {
        const { north } = offset({ latitude: edge, longitude: thing.position.longitude }, thing.position);
        return needOn(side, thing) - Math.abs(north) / METRES_PER_POINT;
      }),
    );
  return { above: room('above', top), below: room('below', bottom) };
}

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
// `ownArea`, what the room of their own marks leaves, and when they do not fit either, the picked Restaurant's side
// is kept in view.
export function correctedCentre(
  drawing: Shown,
  camera: MapCamera,
  size: Size,
  area: ViewArea,
  ownArea: ViewArea = area,
): LatLng | null {
  const place = (position: LatLng): { x: number; y: number } => inView(position, camera, size);
  const shown = drawing.points.every((position) => {
    const { x, y } = place(position);
    return inside({ top: y, right: x, bottom: y, left: x }, area);
  });
  if (shown || drawing.own.length === 0) {
    return null;
  }
  const own = drawing.own.map(place);
  const pick = drawing.pick === null ? null : place(drawing.pick);
  const xs = own.map(({ x }) => x);
  const ys = own.map(({ y }) => y);
  const dx = shiftAlong(Math.min(...xs), Math.max(...xs), ownArea.left, ownArea.right, pick?.x ?? null);
  const dy = shiftAlong(Math.min(...ys), Math.max(...ys), ownArea.top, ownArea.bottom, pick?.y ?? null);
  if (Math.abs(dx) < ONE_POINT && Math.abs(dy) < ONE_POINT) {
    return null;
  }
  // The points move by the shift when the centre moves the other way.
  const centre = project(camera.centre, camera.zoom);
  return unproject({ x: centre.x - dx, y: centre.y - dy }, camera.zoom);
}

// Whether the box around some points at a camera is no wider and no higher than the area.
function fitsIn(points: readonly LatLng[], camera: MapCamera, size: Size, area: ViewArea): boolean {
  const placed = points.map((position) => inView(position, camera, size));
  const xs = placed.map(({ x }) => x);
  const ys = placed.map(({ y }) => y);
  return (
    Math.max(...xs) - Math.min(...xs) <= area.right - area.left + ONE_POINT &&
    Math.max(...ys) - Math.min(...ys) <= area.bottom - area.top + ONE_POINT
  );
}

function areaOf({ top, right, bottom, left }: FitPadding, size: Size): ViewArea {
  return { top, right: size.width - right, bottom: size.height - bottom, left };
}

// How the camera fits the Plan's own points where not every point fits: the padding with the room their marks need
// (`roomsOf` of those points), and how far further out than the map's lowest zoom it may go for them.
export interface OwnFit {
  padding: FitPadding;
  outer: number;
}

// Where the camera goes for an answer's drawing on a campus map whose view has that size: the fit of all its points
// into what the padding leaves, no closer than `closest`. Where the map's lowest zoom is too close for the Plan's own
// points and `own` is given, the fit of those alone into what its padding leaves, out to its `outer` at most. Where a
// point is still outside, moved at that zoom so that the Plan shows. Null for a drawing without points.
export function answerCamera(
  drawing: Shown,
  size: Size,
  padding: FitPadding,
  closest: number,
  own?: OwnFit,
): MapCamera | null {
  const campus = { bounds: CAMERA_BOUNDS, fitBounds: CAMPUS_BOUNDS, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, size };
  const fitted = fit(drawing.points, { padding, maxZoom: closest }, campus);
  if (fitted === null) {
    return null;
  }
  const ownPadding = own?.padding ?? padding;
  const ownArea = areaOf(ownPadding, size);
  const rules = outerRules(campus, own?.outer);
  const wider =
    rules === campus || fitsIn(drawing.own, fitted, size, ownArea)
      ? null
      : fit(drawing.own, { padding: ownPadding, maxZoom: closest }, rules);
  const camera = wider ?? fitted;
  const centre = correctedCentre(drawing, camera, size, areaOf(padding, size), ownArea);
  return centre === null ? camera : settle({ centre, zoom: camera.zoom }, rules);
}

// Room kept between a place brought into view and the area's edge, for its dot.
const PAN_MARGIN = ANSWER_SYMBOL_BOX;
const DOT_ROOM: ViewArea = { top: -PAN_MARGIN, right: PAN_MARGIN, bottom: PAN_MARGIN, left: -PAN_MARGIN };

function into(at: number, before: number, after: number, start: number, end: number): number {
  if (at + before < start) {
    return start - at - before;
  }
  return at + after > end ? end - at - after : 0;
}

// The view moved, at its zoom, just enough to bring a position into its area with the room around it (`room`, in
// points from it, its dot's by default); the same view when it is in already.
export function panToShow(view: LabelView, position: LatLng, room: ViewArea = DOT_ROOM): LabelView {
  const { camera, size, area } = view;
  const { x, y } = inView(position, camera, size);
  const dx = into(x, room.left, room.right, area.left, area.right);
  const dy = into(y, room.top, room.bottom, area.top, area.bottom);
  if (dx === 0 && dy === 0) {
    return view;
  }
  const centre = project(camera.centre, camera.zoom);
  return { ...view, camera: { ...camera, centre: unproject({ x: centre.x - dx, y: centre.y - dy }, camera.zoom) } };
}
