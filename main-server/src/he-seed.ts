/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
import { seedHe } from './he/he.seed.js';

// The command that writes the Heuristic Evaluation's data (P15) into the database at DATABASE_URL, once the seed files
// and the demo data are in: `pnpm he:seed`, or `node dist/he-seed` in the main server's container. A run again writes
// only what is missing. Like `pnpm db:seed`, it needs that setting alone and starts no Nest application.
async function heSeed(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (databaseUrl === undefined) {
    throw new Error('DATABASE_URL is not set');
  }
  // As in PrismaService: pg waits for a new connection without limit by default.
  const adapter = new PrismaPg({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
  const prisma = new PrismaClient({ adapter });
  try {
    const { users, friendships, classes, quests } = await seedHe(prisma);
    new Logger('HeSeed').log(
      `Wrote what was missing: ${users} Users, ${friendships} friendships, ${classes} Classes and ${quests} recruiting Quests`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
await heSeed();
