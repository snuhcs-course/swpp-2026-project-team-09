/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { CollectionStatus, PrismaClient } from '../src/generated/prisma/client.js';
import { daysOf, getMenus, menusMessage, restaurant, servedLunch } from './menus.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { refusal, sendAsWorker } from './worker.js';

const newDay = daysOf('2026-12');
let app: INestApplication<Server>;
let accessToken: string;
// The tests read the status of one Source with a connection of their own.
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  ({ accessToken } = await signIn(app));
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// Only this file sends as the dormitory's Source, so no other file changes its status meanwhile.
function dormitoryMenus(date: string, changes: object = {}): object {
  return menusMessage([{ date, restaurants: [restaurant({ name: '아워홈(901동)' })] }], {
    source: 'dormitory_menus',
    ...changes,
  });
}

function dormitoryStatus(): Promise<CollectionStatus | null> {
  return prisma.collectionStatus.findUnique({ where: { source: 'dormitory_menus' } });
}

describe('A successful Collection', () => {
  it('is recorded with its time for its Source', async () => {
    await sendAsWorker(app, '/menus/collected', dormitoryMenus(newDay()));

    expect(await dormitoryStatus()).toMatchObject({ lastSucceededAt: new Date('2026-10-31T12:00:00Z') });
  });
});

describe('A failed Collection', () => {
  it('is recorded with its time and reason, and the menus stored before are still served', async () => {
    const date = newDay();
    await sendAsWorker(app, '/menus/collected', dormitoryMenus(date));

    await expect(
      sendAsWorker(app, '/collections/failed', {
        source: 'dormitory_menus',
        failedAt: '2026-11-01T05:00:00+09:00',
        reason: 'The page did not answer within 5 seconds',
      }),
    ).resolves.toBeUndefined();

    expect(await dormitoryStatus()).toMatchObject({
      lastSucceededAt: new Date('2026-10-31T12:00:00Z'),
      lastFailedAt: new Date('2026-10-31T20:00:00Z'),
      lastFailureReason: 'The page did not answer within 5 seconds',
    });
    expect((await getMenus(app, accessToken, date)).body).toEqual([
      { name: '아워홈(901동)', collectedAt: '2026-10-31T12:00:00.000Z', meals: [servedLunch] },
    ]);
  });

  it('stays recorded after a later success', async () => {
    await sendAsWorker(app, '/collections/failed', {
      source: 'dormitory_menus',
      failedAt: '2026-11-01T05:00:00+09:00',
      reason: 'The page has no menu table',
    });

    await sendAsWorker(app, '/menus/collected', dormitoryMenus(newDay(), { collectedAt: '2026-11-01T10:00:00+09:00' }));

    expect(await dormitoryStatus()).toMatchObject({
      lastSucceededAt: new Date('2026-11-01T01:00:00Z'),
      lastFailedAt: new Date('2026-10-31T20:00:00Z'),
      lastFailureReason: 'The page has no menu table',
    });
  });
});

describe('A failure message that does not match the schema', () => {
  it('is refused when it does not say what went wrong, and nothing is recorded', async () => {
    const status = await dormitoryStatus();
    const failure = { source: 'dormitory_menus', failedAt: '2026-11-02T05:00:00+09:00' };

    expect(await refusal(app, '/collections/failed', failure)).toContain('reason: ');
    expect(await dormitoryStatus()).toEqual(status);
  });
});

describe('A message larger than 100 kB, the most Express takes unless told otherwise', () => {
  it('is taken: a week of menus', async () => {
    const lines = Array.from({ length: 30 }, (_, index) => ({
      meal: 'lunch',
      text: `제육볶음 ${index} : 6,000원`,
      kind: 'dish',
      name: `제육볶음 ${index}`,
      price: 6000,
    }));
    const restaurants = Array.from({ length: 9 }, (_, index) => restaurant({ name: `식당 ${index}`, lines }));
    const firstDay = newDay();
    const days = [firstDay, ...Array.from({ length: 6 }, newDay)].map((date) => ({ date, restaurants }));
    const message = menusMessage(days, { source: 'dormitory_menus' });
    expect(Buffer.byteLength(JSON.stringify(message))).toBeGreaterThan(102_400);

    await expect(sendAsWorker(app, '/menus/collected', message)).resolves.toBeUndefined();

    expect((await getMenus(app, accessToken, firstDay)).body).toHaveLength(9);
  });
});

describe("A request to a worker's route without the worker's token", () => {
  const failure = {
    source: 'dormitory_menus',
    failedAt: '2026-11-03T05:00:00+09:00',
    reason: 'The page has no menu table',
  };

  it.each([
    ['no token', undefined],
    ['another token', 'not-the-token-that-the-worker-and-the-server-share'],
    ["a User's access token", 'user'],
  ])('is refused and records nothing: %s', async (_, token) => {
    const status = await dormitoryStatus();
    const sent = request(app.getHttpServer()).post('/collections/failed');

    const response = await (
      token === undefined ? sent : sent.auth(token === 'user' ? accessToken : token, { type: 'bearer' })
    ).send(failure);

    expect(response.status).toBe(401);
    expect(await dormitoryStatus()).toEqual(status);
  });

  // A route left unmarked would take the User, and one marked @Public() anyone: either would answer 400 here.
  it.each([
    '/menus/collected',
    '/shuttle/stops/collected',
    '/shuttle/vehicles/collected',
    '/global-events/collected',
    '/global-events/stored-posts',
  ])("is refused on %s, with no token and with a User's access token", async (path) => {
    const withoutToken = await request(app.getHttpServer()).post(path).send({});
    const asUser = await request(app.getHttpServer()).post(path).auth(accessToken, { type: 'bearer' }).send({});

    expect([withoutToken.status, asUser.status]).toEqual([401, 401]);
  });
});
