import type { LatLng } from '@/api/types';
import type { MapBounds } from './types';

// The rectangle the camera stays in: a little wider than the Campus Boundary, which stays the main server's. A
// position outside it is off campus for the app.
export const CAMPUS_BOUNDS: MapBounds = { south: 37.445, west: 126.945, north: 37.471, east: 126.963 };

// Web Mercator zoom levels. The map never shows more than the rectangle, so on a phone the lowest zoom in use is the
// one at which the view fits inside it, a little under 15. Both numbers are settled with the Android module
// (ticket 07).
export const MIN_ZOOM = 14;
export const MAX_ZOOM = 19;

export function centreOf({ south, west, north, east }: MapBounds): LatLng {
  return { latitude: (south + north) / 2, longitude: (west + east) / 2 };
}

export function isInside({ latitude, longitude }: LatLng, { south, west, north, east }: MapBounds): boolean {
  return latitude >= south && latitude <= north && longitude >= west && longitude <= east;
}

// How far the camera is zoomed in, counted from the fit zoom: the zoom at which the whole campus is in view, which
// is the lowest zoom the map allows and depends on the view's size (`onFitZoom` gives it). The `Main` frame zooms by
// a factor z from 1 to 3.5, and a factor z is log2(z) zoom levels.
export const ZOOM_OFFSET = {
  // From here on a place is a pin and not a dot (z 1.6), and the User's own Avatar has its full size.
  pins: Math.log2(1.6),
  // From here on a pin and an Avatar have a name under them (z 2.4).
  names: Math.log2(2.4),
  // Where "가까이 보기", a Friend's row and "내 위치로 이동" bring the camera (z 2.6).
  close: Math.log2(2.6),
  // One press of the zoom in or the zoom out button (a factor 1.5).
  step: Math.log2(1.5),
} as const;

export type ZoomDetail = 'overview' | 'pins' | 'names';

// A camera that was moved to a level is at that level, to the last digits.
const SAME_ZOOM = 1e-6;

// How much detail the map shows at a zoom: dots while the whole campus is in view, pins closer, names closest.
export function zoomDetail(zoom: number, fitZoom: number): ZoomDetail {
  const offset = zoom - fitZoom + SAME_ZOOM;
  if (offset >= ZOOM_OFFSET.names) {
    return 'names';
  }
  return offset >= ZOOM_OFFSET.pins ? 'pins' : 'overview';
}
