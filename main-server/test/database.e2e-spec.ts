/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';

// The tests connect with the server's own settings: the main role and the main database.
function connect(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

describe('Main database', () => {
  const { DATABASE_URL } = inject('settings');

  it('answers a spatial function', async () => {
    const prisma = connect(DATABASE_URL);

    const rows = await prisma.$queryRaw<{ distance: number }[]>`
      SELECT ST_Distance('POINT(0 0)'::geometry, 'POINT(3 4)'::geometry) AS distance`;
    await prisma.$disconnect();

    expect(rows).toEqual([{ distance: 5 }]);
  });

  it('keeps the main role out of the match database', async () => {
    const matchUrl = new URL(DATABASE_URL);
    matchUrl.pathname = '/match';
    const prisma = connect(matchUrl.toString());

    await expect(prisma.$queryRaw`SELECT 1`).rejects.toThrow('permission denied for database "match"');
    await prisma.$disconnect();
  });
});
