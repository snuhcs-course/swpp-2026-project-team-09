import type { LatLng } from '@/api/types';
import type { FitOptions, MapBounds, MapCamera } from './types';

// Web Mercator, and the camera's rules of `types.ts` worked out with it. The plain ground uses these; a native side
// follows the same rules with its SDK's own means.

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CameraRules {
  bounds: MapBounds;
  // The rectangle the lowest zoom fits the view inside. Left out, `bounds`.
  fitBounds?: MapBounds;
  minZoom: number;
  maxZoom: number;
  // The view's size in points.
  size: Size;
}

const TILE = 256;
const HALF_TURN = 180;
const RADIANS = Math.PI / HALF_TURN;

// Where a position is on the world's map at a zoom, in points from its top left.
export function project({ latitude, longitude }: LatLng, zoom: number): Point {
  const world = TILE * 2 ** zoom;
  const sine = Math.sin(latitude * RADIANS);
  return {
    x: ((longitude + HALF_TURN) / (2 * HALF_TURN)) * world,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * world,
  };
}

export function unproject({ x, y }: Point, zoom: number): LatLng {
  const world = TILE * 2 ** zoom;
  return {
    latitude: Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / world))) / RADIANS,
    longitude: (x / world) * 2 * HALF_TURN - HALF_TURN,
  };
}

// The zoom at which a stretch of the world, measured at zoom 0, is as long as a stretch of the view.
function zoomWhere(viewPoints: number, worldPoints: number): number {
  return worldPoints > 0 && viewPoints > 0 ? Math.log2(viewPoints / worldPoints) : Number.POSITIVE_INFINITY;
}

function corners({ south, west, north, east }: MapBounds, zoom: number): { topLeft: Point; bottomRight: Point } {
  return {
    topLeft: project({ latitude: north, longitude: west }, zoom),
    bottomRight: project({ latitude: south, longitude: east }, zoom),
  };
}

// The lowest zoom allowed: the view fits inside the rectangle that fits it from here on.
export function lowestZoom({ bounds, fitBounds = bounds, minZoom, size }: CameraRules): number {
  const { topLeft, bottomRight } = corners(fitBounds, 0);
  const fits = Math.max(
    zoomWhere(size.width, bottomRight.x - topLeft.x),
    zoomWhere(size.height, bottomRight.y - topLeft.y),
  );
  return Number.isFinite(fits) ? Math.max(minZoom, fits) : minZoom;
}

// A value kept between two others, or their middle where the room between them is gone.
function between(value: number, low: number, high: number): number {
  return low > high ? (low + high) / 2 : Math.min(Math.max(value, low), high);
}

// A camera brought inside the rules. A centre that is inside already is kept as it is, to the last digit.
export function settle(camera: MapCamera, rules: CameraRules): MapCamera {
  const low = lowestZoom(rules);
  const zoom = between(camera.zoom, low, Math.max(low, rules.maxZoom));
  const { topLeft, bottomRight } = corners(rules.bounds, zoom);
  const at = project(camera.centre, zoom);
  const x = between(at.x, topLeft.x + rules.size.width / 2, bottomRight.x - rules.size.width / 2);
  const y = between(at.y, topLeft.y + rules.size.height / 2, bottomRight.y - rules.size.height / 2);
  const inside = unproject({ x, y }, zoom);
  return {
    centre: {
      latitude: y === at.y ? camera.centre.latitude : inside.latitude,
      longitude: x === at.x ? camera.centre.longitude : inside.longitude,
    },
    zoom,
  };
}

// The camera that shows all the points with clear room around them, inside the rules and no closer than the
// options' `maxZoom`. Null without points. The points' middle comes to the middle of what the padding leaves of the
// view.
export function fit(
  points: readonly LatLng[],
  options: Pick<FitOptions, 'padding' | 'maxZoom'>,
  rules: CameraRules,
): MapCamera | null {
  if (points.length === 0) {
    return null;
  }
  const { padding = 0, maxZoom = rules.maxZoom } = options;
  const clear =
    typeof padding === 'number' ? { top: padding, right: padding, bottom: padding, left: padding } : padding;
  const projected = points.map((point) => project(point, 0));
  const xs = projected.map(({ x }) => x);
  const ys = projected.map(({ y }) => y);
  const [left, right, top, bottom] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const fits = Math.min(
    zoomWhere(rules.size.width - clear.left - clear.right, right - left),
    zoomWhere(rules.size.height - clear.top - clear.bottom, bottom - top),
  );
  // The zoom the camera will rest at decides how far the unequal padding moves the centre.
  const low = lowestZoom(rules);
  const zoom = between(fits, low, Math.max(low, Math.min(maxZoom, rules.maxZoom)));
  const scale = 2 ** zoom;
  const centre = {
    x: ((left + right) / 2) * scale + (clear.right - clear.left) / 2,
    y: ((top + bottom) / 2) * scale + (clear.bottom - clear.top) / 2,
  };
  return settle({ centre: unproject(centre, zoom), zoom }, rules);
}

// What moves less than this has not moved: a camera that is settled twice differs in its last digits.
const STILL = 1e-9;

export function sameCamera(one: MapCamera, other: MapCamera): boolean {
  return (
    Math.abs(one.zoom - other.zoom) < STILL &&
    Math.abs(one.centre.latitude - other.centre.latitude) < STILL &&
    Math.abs(one.centre.longitude - other.centre.longitude) < STILL
  );
}

// Where a position is in the view of a camera, in points from the view's top left.
export function inView(position: LatLng, camera: MapCamera, size: Size): Point {
  const centre = project(camera.centre, camera.zoom);
  const at = project(position, camera.zoom);
  return { x: at.x - centre.x + size.width / 2, y: at.y - centre.y + size.height / 2 };
}
