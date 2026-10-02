// Kakao's statuses for a walking route it did not find.
export const NO_ROUTE_STATUSES = [
  'SAME_POINT',
  'START_LINK_NOT_FOUND',
  'END_LINK_NOT_FOUND',
  'TOO_MANY_SEARCH_LINK',
  'TOO_FAR_AWAY',
  'ROUTE_RESULT_NOT_FOUND',
] as const;

export type NoRouteStatus = (typeof NO_ROUTE_STATUSES)[number];

export interface CoordinatesDto {
  latitude: number;
  longitude: number;
}

export interface RouteDto {
  line: CoordinatesDto[];
  // In metres.
  distance: number;
  // In seconds.
  duration: number;
}

export type WalkingRouteDto = { status: 'OK'; route: RouteDto } | { status: NoRouteStatus; route: null };
