/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inject } from 'vitest';
import { z } from 'zod';
import { type Position } from '../src/common/geometry.js';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { createDatabase } from './containers.js';

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

// A ring of a seed file, in GeoJSON's order of longitude and latitude, as a Place stores it.
export function positionsOf(ring: [number, number][]): Position[] {
  return ring.map(([longitude, latitude]) => ({ latitude, longitude }));
}

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
    return positionsOf(outline.geometry.coordinates[0]);
  });
}

interface SeedDatabase {
  prisma: () => PrismaClient;
  // A copy of the seed that a test changes.
  corrected: () => string;
  outlinesOfPlace: (number: string) => Promise<unknown>;
  outlinesOfPlaceNamed: (name: string) => Promise<unknown>;
}

// Gives the test file that calls it a database of its own for the seed command, and a copy of the seed.
export function seedDatabase(): SeedDatabase {
  let prisma: PrismaClient;
  let drop: () => Promise<void>;
  let corrected: string;

  beforeAll(async () => {
    ({ prisma, drop } = await createDatabase(inject('settings').DATABASE_URL));
    corrected = await mkdtemp(join(tmpdir(), 'seed-'));
    await cp(SEED_DIRECTORY, corrected, { recursive: true });
  });

  afterAll(async () => {
    await rm(corrected, { recursive: true });
    await drop();
  });

  return {
    prisma: () => prisma,
    corrected: () => corrected,
    outlinesOfPlace: async (number) => (await prisma.place.findFirstOrThrow({ where: { number } })).outlines,
    outlinesOfPlaceNamed: async (name) => (await prisma.place.findFirstOrThrow({ where: { name } })).outlines,
  };
}
