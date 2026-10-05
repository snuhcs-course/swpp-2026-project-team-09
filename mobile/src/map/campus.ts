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
