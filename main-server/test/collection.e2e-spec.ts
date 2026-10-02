import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { CollectionStatus, PrismaClient } from '../src/generated/prisma/client.js';
import { daysOf, getMenus, menusMessage, restaurant, servedLunch } from './menus.js';
import { signIn } from './sign-in.js';
import { refusal, sendAsWorker, startWithWorker, type WorkerHarness } from './worker.js';

const newDay = daysOf('2026-12');
let harness: WorkerHarness;
let accessToken: string;
// No route serves the Collection status yet (P12 adds one), so the tests read it with a connection of their own.
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
    await sendAsWorker(harness.worker, 'menus-collected', dormitoryMenus(newDay()));

    expect(await dormitoryStatus()).toMatchObject({ lastSucceededAt: new Date('2026-10-31T12:00:00Z') });
  });
});

describe('A failed Collection', () => {
  it('is recorded with its time and reason, and the menus stored before are still served', async () => {
    const date = newDay();
    await sendAsWorker(harness.worker, 'menus-collected', dormitoryMenus(date));

    await expect(
      sendAsWorker(harness.worker, 'collection-failed', {
        source: 'dormitory_menus',
        failedAt: '2026-11-01T05:00:00+09:00',
        reason: 'The page did not answer within 10 seconds',
      }),
    ).resolves.toEqual({ status: 'ok' });

    expect(await dormitoryStatus()).toMatchObject({
      lastSucceededAt: new Date('2026-10-31T12:00:00Z'),
      lastFailedAt: new Date('2026-10-31T20:00:00Z'),
      lastFailureReason: 'The page did not answer within 10 seconds',
    });
    expect((await getMenus(harness.app, accessToken, date)).body).toEqual([
      { name: '아워홈(901동)', collectedAt: '2026-10-31T12:00:00.000Z', meals: [servedLunch] },
    ]);
  });

  it('stays recorded after a later success', async () => {
    await sendAsWorker(harness.worker, 'collection-failed', {
      source: 'dormitory_menus',
      failedAt: '2026-11-01T05:00:00+09:00',
      reason: 'The page has no menu table',
    });

    await sendAsWorker(
      harness.worker,
      'menus-collected',
      dormitoryMenus(newDay(), { collectedAt: '2026-11-01T10:00:00+09:00' }),
    );

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

    expect(await refusal(harness.worker, 'collection-failed', failure)).toContain('reason: ');
    expect(await dormitoryStatus()).toEqual(status);
  });
});
