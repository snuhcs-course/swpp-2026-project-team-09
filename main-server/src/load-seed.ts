// AI-generated with Claude Opus 5.5, 2026-10-03 to 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #29 #31 #32
import { readCampusBoundary } from './common/campus-boundary.js';
import { SEED_DIRECTORY } from './common/seed-directory.js';
import { PrismaClient } from './generated/prisma/client.js';
import { loadPlaces } from './places/places.seed.js';
import { loadShuttle } from './shuttle/shuttle.seed.js';

// `directory` lets a test load a corrected copy of the seed.
export async function loadSeed(
  prisma: PrismaClient,
  directory = SEED_DIRECTORY,
): Promise<{ places: number; shuttleStops: number }> {
  return {
    places: await loadPlaces(prisma, directory, await readCampusBoundary(directory)),
    shuttleStops: await loadShuttle(prisma, directory),
  };
}
