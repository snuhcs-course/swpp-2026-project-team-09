/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-05  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import type { MapBounds, MapProps } from './types';

// The on-campus rectangle: a little wider than the Campus Boundary, which stays the main server's. A position outside
// it is off campus for the app: the User's own Avatar is not shown there, and 장소 선택 does not open on it nor pick
// it. The lowest zoom is the one at which the view fits inside it.
export const CAMPUS_BOUNDS: MapBounds = { south: 37.445, west: 126.945, north: 37.471, east: 126.963 };

// The rectangle widened by half its height to the north and to the south and by half its width to the east and to
// the west.
function widened({ south, west, north, east }: MapBounds): MapBounds {
  const [height, width] = [north - south, east - west];
  return { south: south - height / 2, west: west - width / 2, north: north + height / 2, east: east + width / 2 };
}

// The area the camera may move over: about half a campus past each edge of the on-campus rectangle (ticket 03).
export const CAMERA_BOUNDS: MapBounds = widened(CAMPUS_BOUNDS);

// Web Mercator zoom levels, settled on Kakao's map (ticket 07). The lowest zoom in use is the one at which the view
// fits inside the on-campus rectangle: 14.97 on a phone 411 points wide. `MIN_ZOOM` is only a floor under that. At
// `MAX_ZOOM` one building fills the view.
export const MIN_ZOOM = 14;
export const MAX_ZOOM = 19;

// The lowest level of Kakao's SDK, which takes whole levels only: pinching out stops there instead of snapping back
// from below the lowest zoom. A hair closer than the lowest zoom of 14.97.
export const NATIVE_MIN_LEVEL = 15;

// The camera every campus map has: it moves over the camera's area, no further out than the zoom at which the view
// fits inside the on-campus rectangle, and on a native map a pinch out stops at Kakao's level 15.
export const CAMPUS_CAMERA = {
  bounds: CAMERA_BOUNDS,
  fitBounds: CAMPUS_BOUNDS,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  nativeMinLevel: NATIVE_MIN_LEVEL,
} as const satisfies Partial<MapProps>;

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
