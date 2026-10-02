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

export async function readCampusBoundary(directory: string): Promise<CampusBoundary> {
  const { geometry } = await readSeedFile(directory, 'campus-boundary.geojson', boundaryFileSchema);
  return new CampusBoundary(geometry.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude })));
}
