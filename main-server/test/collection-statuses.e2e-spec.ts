import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { createDatabase } from './containers.js';
import { signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

// Every Source is collected by some test file of the shared database, so these tests run on a database of their own,
// where no Source has been collected.
let app: INestApplication<Server>;
let prisma: PrismaClient;
let drop: () => Promise<void>;

beforeAll(async () => {
  const database = await createDatabase(inject('settings').DATABASE_URL);
  ({ prisma, drop } = database);
  app = await startApp({ ...inject('settings'), DATABASE_URL: database.url });
});

afterAll(async () => {
  await app.close();
  await drop();
});

const neverCollected = { lastSucceededAt: null, lastFailedAt: null, lastFailureReason: null };

describe("An Administrator's list of Collection statuses", () => {
  it('answers every Source in the order of the Sources, with nothing for one never collected', async () => {
    await prisma.collectionStatus.create({
      data: {
        source: 'shuttle_stops',
        lastSucceededAt: new Date('2026-10-05T22:00:00Z'),
        lastFailedAt: new Date('2026-10-04T22:00:00Z'),
        lastFailureReason: 'The route page answered 503.',
      },
    });
    const { accessToken } = await signInAsAdministrator(app);

    const response = await request(app.getHttpServer())
      .get('/admin/collection-statuses')
      .auth(accessToken, { type: 'bearer' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { source: 'coop_menus', ...neverCollected },
      { source: 'dormitory_menus', ...neverCollected },
      { source: 'veterinary_menus', ...neverCollected },
      {
        source: 'shuttle_stops',
        lastSucceededAt: '2026-10-05T22:00:00.000Z',
        lastFailedAt: '2026-10-04T22:00:00.000Z',
        lastFailureReason: 'The route page answered 503.',
      },
      { source: 'shuttle_vehicles', ...neverCollected },
      { source: 'snu_events', ...neverCollected },
    ]);
  });
});
