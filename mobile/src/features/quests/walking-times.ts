/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LatLng } from '@/api/types';
import type { WalkingRoute } from '@/api/walking-route-types';

// How far a member who shares is on foot from the room's next place. The route is the main server's
// (`GET /walking-route`, one call per member), asked again only when the member has moved more than 100 m since the
// last route, at most once a minute per member, and only while the room is open (P06 ticket 06).

export const MOVED_METRES = 100;
export const ROUTE_EVERY_MS = 60_000;
// Within this of the place, the member is there, and no route is asked.
export const THERE_METRES = 50;

// The last route asked for a member: from where, when, and to which place.
export interface AskedRoute {
  from: LatLng;
  at: number;
  to: string;
}

// What the member's line adds: `{place}까지 도보 {n}분` or `{place}에 있어요`.
export type WalkingTime = { to: string; there: true } | { to: string; there: false; minutes: number };

const EARTH_RADIUS_M = 6_371_000;

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function metresBetween(one: LatLng, other: LatLng): number {
  const latitude = radians(other.latitude - one.latitude);
  const longitude = radians(other.longitude - one.longitude);
  const half =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(one.latitude)) * Math.cos(radians(other.latitude)) * Math.sin(longitude / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(half));
}

// The place a route goes to, as a key that changes with the place.
export function placeKey(at: LatLng): string {
  return `${String(at.latitude)},${String(at.longitude)}`;
}

// Whether a route is asked for the member now: the first time, and after that at most once a minute, when the place
// changed, the member moved more than 100 m since the last one, or what was shown no longer holds (`stale`: the member
// was at the place and has left it).
export function asksRoute(
  last: AskedRoute | undefined,
  { from, to, nowMs, stale }: { from: LatLng; to: string; nowMs: number; stale: boolean },
): boolean {
  if (last === undefined) {
    return true;
  }
  if (nowMs - last.at < ROUTE_EVERY_MS) {
    return false;
  }
  return stale || last.to !== to || metresBetween(last.from, from) > MOVED_METRES;
}

// What a route says: the member is there, so many minutes away (at least 1), or nothing for no route.
export function timeOf(route: WalkingRoute, to: string): WalkingTime | null {
  if (route.status === 'SAME_POINT') {
    return { to, there: true };
  }
  return route.status === 'OK'
    ? { to, there: false, minutes: Math.max(1, Math.round(route.route.duration / 60)) }
    : null;
}

// The words after `위치 공유 중 · `.
export function walkingWords(time: WalkingTime, label: string): string {
  return time.there ? `${label}에 있어요` : `${label}까지 도보 ${String(time.minutes)}분`;
}
