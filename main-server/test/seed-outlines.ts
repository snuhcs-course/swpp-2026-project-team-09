import { z } from 'zod';
import { type Position } from '../src/common/geometry.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';

export const NATIONAL_MAP = 'national-map-outlines.geojson';
const OPENSTREETMAP = 'openstreetmap-outlines.geojson';

export const outlinesFileSchema = z.looseObject({
  features: z.array(
    z.looseObject({
      id: z.string(),
      geometry: z.object({ type: z.string(), coordinates: z.tuple([z.array(z.tuple([z.number(), z.number()]))]) }),
    }),
  ),
});

// The seed's outlines with these identifiers, the national map's or OpenStreetMap's, as a Place stores them.
export async function outlines(...ids: string[]): Promise<Position[][]> {
  const files = await Promise.all(
    [NATIONAL_MAP, OPENSTREETMAP].map((file) => readSeedFile(SEED_DIRECTORY, file, outlinesFileSchema)),
  );
  const features = files.flatMap((file) => file.features);
  return ids.map((id) => {
    const outline = features.find((feature) => feature.id === id);
    if (outline === undefined) {
      throw new Error(`The seed holds no outline ${id}`);
    }
    return outline.geometry.coordinates[0].map(([longitude, latitude]) => ({ latitude, longitude }));
  });
}
