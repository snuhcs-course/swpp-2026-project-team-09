import { loadPlaces } from './places/places.seed.js';
import { readCampusBoundary } from './common/campus-boundary.js';
import { SEED_DIRECTORY } from './common/seed-directory.js';
import { PrismaClient } from './generated/prisma/client.js';

// `directory` lets a test load a corrected copy of the seed.
export async function loadSeed(prisma: PrismaClient, directory = SEED_DIRECTORY): Promise<{ places: number }> {
  return { places: await loadPlaces(prisma, directory, await readCampusBoundary(directory)) };
}
