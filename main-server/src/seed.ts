/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
import { loadSeed } from './load-seed.js';

// The command that loads the seed files into the database at DATABASE_URL: `pnpm db:seed`. Like `pnpm db:migrate`, it
// needs that setting alone, so it starts no Nest application, which would check every setting of the server.
async function seed(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (databaseUrl === undefined) {
    throw new Error('DATABASE_URL is not set');
  }
  // As in PrismaService: pg waits for a new connection without limit by default.
  const adapter = new PrismaPg({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
  const prisma = new PrismaClient({ adapter });
  try {
    const { places, shuttleStops } = await loadSeed(prisma);
    new Logger('Seed').log(`Loaded ${places} places and ${shuttleStops} shuttle stops`);
  } finally {
    await prisma.$disconnect();
  }
}
await seed();
