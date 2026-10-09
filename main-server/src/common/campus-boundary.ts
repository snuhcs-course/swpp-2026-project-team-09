/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';
import { encloses, metresToRing, type Position } from './geometry.js';
import { readSeedFile } from './seed-directory.js';

// One ring, without holes, in GeoJSON's order of longitude and latitude.
const boundaryFileSchema = z.object({
  geometry: z.object({
    type: z.literal('Polygon'),
    coordinates: z.tuple([z.array(z.tuple([z.number(), z.number()])).min(4)]),
  }),
});

// A phone reports its position some metres off, so a position this far outside the outline still counts as inside.
const MARGIN_IN_METRES = 10;

export class CampusBoundary {
  constructor(readonly outline: readonly Position[]) {}

  contains(position: Position): boolean {
    return encloses(this.outline, position) || metresToRing(this.outline, position) <= MARGIN_IN_METRES;
  }
}

export async function readCampusBoundary(directory: string): Promise<CampusBoundary> {
  const { geometry } = await readSeedFile(directory, 'campus-boundary.geojson', boundaryFileSchema);
  return new CampusBoundary(geometry.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude })));
}
