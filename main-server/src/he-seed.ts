/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
import { seedHe } from './he/he.seed.js';

// The HE data (README.md: HE data). Like `pnpm db:seed`, it needs DATABASE_URL alone and starts no Nest application.
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
