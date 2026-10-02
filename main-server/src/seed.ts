import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
import { loadSeed } from './load-seed.js';

// The command that loads the seed files into the database at DATABASE_URL: `pnpm db:seed`. Loading again updates the
// entries in place.
async function seed(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (databaseUrl === undefined) {
    throw new Error('DATABASE_URL is not set');
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const { buildings } = await loadSeed(prisma);
    new Logger('Seed').log(`Loaded ${buildings} buildings`);
  } finally {
    await prisma.$disconnect();
  }
}
await seed();
