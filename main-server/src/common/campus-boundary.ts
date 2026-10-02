import { z } from 'zod';
import { readSeedFile } from './seed-directory.js';

export interface Position {
  latitude: number;
  longitude: number;
}

// One ring, without holes, in GeoJSON's order of longitude and latitude.
const boundaryFileSchema = z.object({
  geometry: z.object({
    type: z.literal('Polygon'),
    coordinates: z.tuple([z.array(z.tuple([z.number(), z.number()])).min(4)]),
  }),
});

// A phone reports its position some metres off, so a position this far outside the outline still counts as inside.
const MARGIN_IN_METRES = 10;

// Of latitude. A degree of longitude is as long times the cosine of the latitude.
const METRES_PER_DEGREE = 111_195;

// From the origin to the nearest point of the segment from (ax, ay) to (bx, by).
function distanceToSegment(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const along = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSquared));
  return Math.hypot(ax + along * dx, ay + along * dy);
}

export class CampusBoundary {
  constructor(readonly outline: readonly Position[]) {}

  contains(position: Position): boolean {
    return this.encloses(position) || this.metresFromOutline(position) <= MARGIN_IN_METRES;
  }

  private metresFromOutline({ latitude, longitude }: Position): number {
    const metresPerDegreeEast = METRES_PER_DEGREE * Math.cos((latitude * Math.PI) / 180);
    let nearest = Number.POSITIVE_INFINITY;
    let previous = this.outline.at(-1);
    for (const point of this.outline) {
      if (previous !== undefined) {
        // Each end of the edge as metres east and north of the position.
        nearest = Math.min(
          nearest,
          distanceToSegment(
            (previous.longitude - longitude) * metresPerDegreeEast,
            (previous.latitude - latitude) * METRES_PER_DEGREE,
            (point.longitude - longitude) * metresPerDegreeEast,
            (point.latitude - latitude) * METRES_PER_DEGREE,
          ),
        );
      }
      previous = point;
    }
    return nearest;
  }

  // Counts the edges that a line from the position eastwards crosses. Latitude and longitude serve as plane
  // coordinates, which is close enough across a campus.
  private encloses({ latitude, longitude }: Position): boolean {
    let inside = false;
    let previous = this.outline.at(-1);
    for (const point of this.outline) {
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
}

export async function readCampusBoundary(directory: string): Promise<CampusBoundary> {
  const { geometry } = await readSeedFile(directory, 'campus-boundary.geojson', boundaryFileSchema);
  return new CampusBoundary(geometry.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude })));
}
