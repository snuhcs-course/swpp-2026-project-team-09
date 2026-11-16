/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from './types';

// A Private Zone's outline judged as the main server judges it (main-server's `private-zone-outline.ts`), with
// latitude and longitude as plane coordinates, which is close enough across a campus.

export const PRIVATE_ZONES_MAX = 5;
export const OUTLINE_MAX_POINTS = 200;
// An outline is too small when both sides of its bounding box are shorter. The box, not the enclosed area, decides,
// so that a figure eight of two equal lobes is taken.
const MIN_SIDE_METRES = 17;
// The Campus Boundary's margin: the edge leans towards hiding.
const EDGE_METRES = 10;

// Of latitude. A degree of longitude is as long times the cosine of the latitude.
const METRES_PER_DEGREE = 111_195;

function metresPerDegreeEast(latitude: number): number {
  return METRES_PER_DEGREE * Math.cos((latitude * Math.PI) / 180);
}

export function metresBetween(one: LatLng, other: LatLng): number {
  return Math.hypot(
    (one.longitude - other.longitude) * metresPerDegreeEast(one.latitude),
    (one.latitude - other.latitude) * METRES_PER_DEGREE,
  );
}

export function middleOf(ring: readonly LatLng[]): LatLng {
  const latitudes = ring.map(({ latitude }) => latitude);
  const longitudes = ring.map(({ longitude }) => longitude);
  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  };
}

export function isTooSmall(ring: readonly LatLng[]): boolean {
  const latitudes = ring.map(({ latitude }) => latitude);
  const longitudes = ring.map(({ longitude }) => longitude);
  const eastWest = (Math.max(...longitudes) - Math.min(...longitudes)) * metresPerDegreeEast(middleOf(ring).latitude);
  const northSouth = (Math.max(...latitudes) - Math.min(...latitudes)) * METRES_PER_DEGREE;
  return eastWest < MIN_SIDE_METRES && northSouth < MIN_SIDE_METRES;
}

// By the nonzero winding rule, SVG's default fill: a loop that crosses itself holds everything inside any of its turns.
function enclosesByWinding(ring: readonly LatLng[], { latitude, longitude }: LatLng): boolean {
  let winding = 0;
  let previous = ring.at(-1);
  for (const point of ring) {
    if (previous !== undefined) {
      // Above zero when the position lies left of the edge from previous to point.
      const side =
        (point.longitude - previous.longitude) * (latitude - previous.latitude) -
        (longitude - previous.longitude) * (point.latitude - previous.latitude);
      if (previous.latitude <= latitude && point.latitude > latitude && side > 0) {
        winding += 1;
      } else if (previous.latitude > latitude && point.latitude <= latitude && side < 0) {
        winding -= 1;
      }
    }
    previous = point;
  }
  return winding !== 0;
}

// From the origin to the nearest point of the segment from (ax, ay) to (bx, by).
function distanceToSegment(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const along = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSquared));
  return Math.hypot(ax + along * dx, ay + along * dy);
}

// From the position to the nearest edge of the ring, the last point joined to the first.
export function metresToRing(ring: readonly LatLng[], { latitude, longitude }: LatLng): number {
  const east = metresPerDegreeEast(latitude);
  let nearest = Number.POSITIVE_INFINITY;
  let previous = ring.at(-1);
  for (const point of ring) {
    if (previous !== undefined) {
      nearest = Math.min(
        nearest,
        distanceToSegment(
          (previous.longitude - longitude) * east,
          (previous.latitude - latitude) * METRES_PER_DEGREE,
          (point.longitude - longitude) * east,
          (point.latitude - latitude) * METRES_PER_DEGREE,
        ),
      );
    }
    previous = point;
  }
  return nearest;
}

// Whether the zone hides a User at the position: inside the outline by the rule the screen's fill uses, or near it.
export function zoneHolds(ring: readonly LatLng[], position: LatLng): boolean {
  return enclosesByWinding(ring, position) || metresToRing(ring, position) <= EDGE_METRES;
}
