import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { startApp } from './start-app.js';

describe('Main database', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await startApp(inject('settings'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers a spatial function', async () => {
    // Imported after startApp, which loads the server's modules afresh, so that it is the class the server uses.
    const { PrismaService } = await import('../src/common/prisma.service.js');
    const prisma = app.get(PrismaService);

    const rows = await prisma.$queryRaw<{ distance: number }[]>`
      SELECT ST_Distance('POINT(0 0)'::geometry, 'POINT(3 4)'::geometry) AS distance`;

    expect(rows).toEqual([{ distance: 5 }]);
  });
});
