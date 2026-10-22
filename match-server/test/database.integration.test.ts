/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';

// The tests connect with the server's own role, the match role.
function connect(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

describe('Match database', () => {
  const { DATABASE_URL } = inject('settings');

  it('keeps the match role out of the main database', async () => {
    const mainUrl = new URL(DATABASE_URL);
    mainUrl.pathname = '/main';
    const prisma = connect(mainUrl.toString());

    await expect(prisma.$queryRaw`SELECT 1`).rejects.toThrow('permission denied for database "main"');
    await prisma.$disconnect();
  });
});
