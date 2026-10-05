import type { LatLng, WalkingRoute } from '@/api/types';

const EARTH_RADIUS_M = 6_371_000;
const POINTS = 12;
// How far the middle of the line leaves the straight way, as a share of its length.
const BEND = 0.18;
// A walk is longer than the straight way, and a person walks about 1.1 metres a second.
const DETOUR = 1.25;
const WALKING_SPEED = 1.1;

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function metresBetween(from: LatLng, to: LatLng): number {
  const latitude = radians(to.latitude - from.latitude);
  const longitude = radians(to.longitude - from.longitude);
  const half =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitude / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(half));
}

// A short curved line between two points, in the main server's shape: no road is followed.
export function mockWalkingRoute(from: LatLng, to: LatLng): WalkingRoute {
  if (from.latitude === to.latitude && from.longitude === to.longitude) {
    return { status: 'SAME_POINT', route: null };
  }
  const bend = {
    latitude: (from.latitude + to.latitude) / 2 - (to.longitude - from.longitude) * BEND,
    longitude: (from.longitude + to.longitude) / 2 + (to.latitude - from.latitude) * BEND,
  };
  const line = Array.from({ length: POINTS + 1 }, (_, index) => {
    const along = index / POINTS;
    const start = (1 - along) ** 2;
    const middle = 2 * (1 - along) * along;
    const end = along ** 2;
    return {
      latitude: start * from.latitude + middle * bend.latitude + end * to.latitude,
      longitude: start * from.longitude + middle * bend.longitude + end * to.longitude,
    };
  });
  const distance = Math.round(metresBetween(from, to) * DETOUR);
  return { status: 'OK', route: { line, distance, duration: Math.round(distance / WALKING_SPEED) } };
}
