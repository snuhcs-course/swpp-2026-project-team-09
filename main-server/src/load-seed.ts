import { loadBuildings } from './buildings/buildings.seed.js';
import { readCampusBoundary } from './common/campus-boundary.js';
import { SEED_DIRECTORY } from './common/seed-directory.js';
import { PrismaClient } from './generated/prisma/client.js';
import { loadShuttle } from './shuttle/shuttle.seed.js';

// `directory` lets a test load a corrected copy of the seed.
export async function loadSeed(
  prisma: PrismaClient,
  directory = SEED_DIRECTORY,
): Promise<{ buildings: number; shuttleStops: number }> {
  return {
    buildings: await loadBuildings(prisma, directory, await readCampusBoundary(directory)),
    shuttleStops: await loadShuttle(prisma, directory),
  };
}
