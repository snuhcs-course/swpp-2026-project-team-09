// AI-generated with Claude Opus 5.5, 2026-10-02, prompted by TaeHyun79, reviewed by fyoon46 in #28
import { KakaoRoute, NoRouteStatus } from './kakao-walk-answer.dto.js';

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

export type WalkingRouteAnswerDto = { status: 'OK'; route: RouteDto } | { status: NoRouteStatus; route: null };

export function toRouteDto({ legs, properties }: KakaoRoute): RouteDto {
  const points = legs.flatMap(({ steps }) => steps.flatMap(({ path }) => path.points));
  // Each step begins at the point where the one before it ended.
  const line = points.filter(
    ([x, y], index) => index === 0 || x !== points[index - 1][0] || y !== points[index - 1][1],
  );
  return {
    line: line.map(([longitude, latitude]) => ({ latitude, longitude })),
    distance: properties.totalDistance,
    duration: properties.totalTime,
  };
}
