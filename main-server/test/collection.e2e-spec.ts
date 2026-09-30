import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { daysOf, getMenus, menusMessage, restaurantMenus } from './menus.js';
import { signIn } from './sign-in.js';
import { refusal, sendAsWorker, startWithWorker, type WorkerHarness } from './worker.js';

const newDay = daysOf('2026-12');
let harness: WorkerHarness;
let accessToken: string;
// No route serves the collection status yet, so the tests read it with their own connection.
let prisma: PrismaClient;

beforeAll(async () => {
  harness = await startWithWorker();
  ({ accessToken } = await signIn(harness.app));
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await harness.close();
});

describe('A failed collection', () => {
  it('is recorded with its time and reason, and the menus stored before are still served', async () => {
    const date = newDay();
    await sendAsWorker(
      harness.worker,
      'menus-collected',
      menusMessage([restaurantMenus(date, { restaurant: '아워홈(901동)', operatingHours: null })], {
        source: 'dormitory_menus',
      }),
    );

    await expect(
      sendAsWorker(harness.worker, 'collection-failed', {
        source: 'dormitory_menus',
        failedAt: '2026-11-01T09:00:00+09:00',
        reason: 'The page did not answer within 10 seconds',
      }),
    ).resolves.toEqual({ status: 'ok' });

    expect(await prisma.collectionStatus.findUnique({ where: { source: 'dormitory_menus' } })).toMatchObject({
      lastSucceededAt: new Date('2026-10-31T12:00:00Z'),
      lastFailedAt: new Date('2026-11-01T00:00:00Z'),
      lastFailureReason: 'The page did not answer within 10 seconds',
    });
    expect((await getMenus(harness.app, accessToken, date)).body).toEqual([
      {
        restaurant: '아워홈(901동)',
        operatingHours: null,
        collectedAt: '2026-10-31T12:00:00.000Z',
        meals: [{ meal: 'lunch', entries: [{ name: '제육볶음', price: 6000 }] }],
      },
    ]);
  });

  it('is refused when it does not say what went wrong, and nothing is recorded', async () => {
    const status = await prisma.collectionStatus.findUnique({ where: { source: 'dormitory_menus' } });
    const failure = { source: 'dormitory_menus', failedAt: '2026-11-02T09:00:00+09:00' };

    expect(await refusal(harness.worker, 'collection-failed', failure)).toContain('reason: ');
    expect(await prisma.collectionStatus.findUnique({ where: { source: 'dormitory_menus' } })).toEqual(status);
  });
});
