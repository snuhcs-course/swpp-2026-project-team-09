import type { LatLng } from './types';

// --- Walking route (GET /walking-route) ---

export type NoRouteStatus =
  | 'SAME_POINT'
  | 'START_LINK_NOT_FOUND'
  | 'END_LINK_NOT_FOUND'
  | 'TOO_MANY_SEARCH_LINK'
  | 'TOO_FAR_AWAY'
  | 'ROUTE_RESULT_NOT_FOUND';

// The distance is in metres and the duration in seconds.
export type WalkingRoute =
  | { status: 'OK'; route: { line: LatLng[]; distance: number; duration: number } }
  | { status: NoRouteStatus; route: null };
