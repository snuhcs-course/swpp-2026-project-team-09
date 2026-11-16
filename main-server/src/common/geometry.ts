/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A type, not an interface, so that a list of positions is JSON that Prisma stores.
export type Position = { latitude: number; longitude: number };

// Of latitude. A degree of longitude is as long times the cosine of the latitude.
export const METRES_PER_DEGREE = 111_195;

export function metresPerDegreeEast(latitude: number): number {
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

// Whether the ring holds the position by the nonzero winding rule, SVG's default fill: a loop that crosses itself holds
// everything inside any of its turns, where `encloses` leaves out what two turns cover.
export function enclosesByWinding(ring: readonly Position[], { latitude, longitude }: Position): boolean {
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

// The middle of the ring's bounding box.
export function middleOf(ring: readonly Position[]): Position {
  const latitudes = ring.map(({ latitude }) => latitude);
  const longitudes = ring.map(({ longitude }) => longitude);
  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
  };
}

// The sides of the ring's bounding box in metres, west to east as long as at the box's middle.
export function boxSidesOf(ring: readonly Position[]): { eastWest: number; northSouth: number } {
  const latitudes = ring.map(({ latitude }) => latitude);
  const longitudes = ring.map(({ longitude }) => longitude);
  return {
    eastWest: (Math.max(...longitudes) - Math.min(...longitudes)) * metresPerDegreeEast(middleOf(ring).latitude),
    northSouth: (Math.max(...latitudes) - Math.min(...latitudes)) * METRES_PER_DEGREE,
  };
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
