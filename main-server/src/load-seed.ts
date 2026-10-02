import { loadBuildings } from './buildings/buildings.seed.js';
import { readCampusBoundary } from './common/campus-boundary.js';
import { SEED_DIRECTORY } from './common/seed-directory.js';
import { PrismaClient } from './generated/prisma/client.js';

// Loads the seed files of `directory` into the database. `pnpm db:seed` and the tests call it.
export async function loadSeed(prisma: PrismaClient, directory = SEED_DIRECTORY): Promise<{ buildings: number }> {
  return { buildings: await loadBuildings(prisma, directory, readCampusBoundary(directory)) };
}
