import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

export interface Position {
  latitude: number;
  longitude: number;
}

// One ring, without holes, in GeoJSON's order of longitude and latitude.
const boundaryFile = z.object({
  geometry: z.object({
    type: z.literal('Polygon'),
    coordinates: z.tuple([z.array(z.tuple([z.number(), z.number()])).min(4)]),
  }),
});

// The outline of the Gwanak campus. A position outside it is off campus.
export class CampusBoundary {
  constructor(readonly outline: readonly Position[]) {}

  // Counts the edges that a line from the position eastwards crosses. Latitude and longitude serve as plane
  // coordinates, which is close enough across a campus.
  contains({ latitude, longitude }: Position): boolean {
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

export function readCampusBoundary(directory: string): CampusBoundary {
  const { geometry } = boundaryFile.parse(JSON.parse(readFileSync(join(directory, 'campus-boundary.geojson'), 'utf8')));
  return new CampusBoundary(geometry.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude })));
}
