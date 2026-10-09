/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// A type, not an interface, so that a list of positions is JSON that Prisma stores.
export type Position = { latitude: number; longitude: number };

// Of latitude. A degree of longitude is as long times the cosine of the latitude.
const METRES_PER_DEGREE = 111_195;

function metresPerDegreeEast(latitude: number): number {
  return METRES_PER_DEGREE * Math.cos((latitude * Math.PI) / 180);
}

// From the origin to the nearest point of the segment from (ax, ay) to (bx, by).
function distanceToSegment(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const along = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSquared));
  return Math.hypot(ax + along * dx, ay + along * dy);
}

export function metresBetween(a: Position, b: Position): number {
  return Math.hypot(
    (a.longitude - b.longitude) * metresPerDegreeEast(a.latitude),
    (a.latitude - b.latitude) * METRES_PER_DEGREE,
  );
}

// Whether the ring holds the position: counts the edges that a line from the position eastwards crosses. Latitude and
// longitude serve as plane coordinates, which is close enough across a campus.
export function encloses(ring: readonly Position[], { latitude, longitude }: Position): boolean {
  let inside = false;
  let previous = ring.at(-1);
  for (const point of ring) {
    if (previous !== undefined && point.latitude > latitude !== previous.latitude > latitude) {
      const crossing =
        point.longitude +
        ((latitude - point.latitude) * (previous.longitude - point.longitude)) / (previous.latitude - point.latitude);
      if (longitude < crossing) {
        inside = !inside;
      }
    }
    previous = point;
  }
  return inside;
}

// From the position to the nearest edge of the ring.
export function metresToRing(ring: readonly Position[], { latitude, longitude }: Position): number {
  const east = metresPerDegreeEast(latitude);
  let nearest = Number.POSITIVE_INFINITY;
  let previous = ring.at(-1);
  for (const point of ring) {
    if (previous !== undefined) {
      // Each end of the edge as metres east and north of the position.
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
