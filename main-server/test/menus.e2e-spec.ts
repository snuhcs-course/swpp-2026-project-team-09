import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { daysOf, getMenus, menusMessage, restaurantMenus } from './menus.js';
import { signIn } from './sign-in.js';
import { refusal, sendAsWorker, startWithWorker, type WorkerHarness } from './worker.js';

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

const newDay = daysOf('2026-11');

function menusOn(date: string): request.Test {
  return getMenus(harness.app, accessToken, date);
}

describe('Menus collected by the worker', () => {
  it('are stored and served by restaurant and meal, with prices, hours and the collection time', async () => {
    const date = newDay();

    const message = menusMessage([
      restaurantMenus(date, {
        entries: [
          { meal: 'lunch', name: '제육볶음', price: 6000 },
          { meal: 'breakfast', name: '토스트', price: 3000 },
          { meal: 'lunch', name: '비빔밥', price: null },
        ],
      }),
      restaurantMenus(date, {
        restaurant: '자하연식당',
        operatingHours: null,
        entries: [{ meal: 'dinner', name: '돈까스', price: 5500 }],
      }),
    ]);

    await expect(sendAsWorker(harness.worker, 'menus-collected', message)).resolves.toEqual({ status: 'ok' });

    const response = await menusOn(date);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        restaurant: '자하연식당',
        operatingHours: null,
        collectedAt: '2026-10-31T12:00:00.000Z',
        meals: [{ meal: 'dinner', entries: [{ name: '돈까스', price: 5500 }] }],
      },
      {
        restaurant: '학생회관식당',
        operatingHours: '※ 운영시간 : 11:00~14:30',
        collectedAt: '2026-10-31T12:00:00.000Z',
        meals: [
          { meal: 'breakfast', entries: [{ name: '토스트', price: 3000 }] },
          {
            meal: 'lunch',
            entries: [
              { name: '제육볶음', price: 6000 },
              { name: '비빔밥', price: null },
            ],
          },
        ],
      },
    ]);
  });
});

describe('A restaurant sent without entries, one closed or not posted yet', () => {
  it('is served without meals', async () => {
    const date = newDay();

    await sendAsWorker(harness.worker, 'menus-collected', menusMessage([restaurantMenus(date, { entries: [] })]));

    expect((await menusOn(date)).body).toEqual([
      {
        restaurant: '학생회관식당',
        operatingHours: '※ 운영시간 : 11:00~14:30',
        collectedAt: '2026-10-31T12:00:00.000Z',
        meals: [],
      },
    ]);
  });
});

describe('The same menus message twice', () => {
  it('is stored once', async () => {
    const date = newDay();
    const message = menusMessage([restaurantMenus(date)]);

    await sendAsWorker(harness.worker, 'menus-collected', message);
    await sendAsWorker(harness.worker, 'menus-collected', message);

    expect((await menusOn(date)).body).toEqual([
      {
        restaurant: '학생회관식당',
        operatingHours: '※ 운영시간 : 11:00~14:30',
        collectedAt: '2026-10-31T12:00:00.000Z',
        meals: [{ meal: 'lunch', entries: [{ name: '제육볶음', price: 6000 }] }],
      },
    ]);
  });
});

describe("A later collection of a source's day", () => {
  it('replaces every restaurant of that source that day, and leaves its other days and other sources', async () => {
    const [date, otherDate] = [newDay(), newDay()];
    await sendAsWorker(
      harness.worker,
      'menus-collected',
      menusMessage([
        restaurantMenus(date),
        restaurantMenus(date, { restaurant: '자하연식당' }),
        restaurantMenus(otherDate),
      ]),
    );
    await sendAsWorker(
      harness.worker,
      'menus-collected',
      menusMessage([restaurantMenus(date, { restaurant: '수의대식당' })], { source: 'veterinary_menus' }),
    );

    // The page dropped 자하연식당 and changed the other restaurant's menu and hours.
    await sendAsWorker(
      harness.worker,
      'menus-collected',
      menusMessage(
        [restaurantMenus(date, { operatingHours: null, entries: [{ meal: 'lunch', name: '김치찌개', price: 5500 }] })],
        { collectedAt: '2026-11-01T09:00:00+09:00' },
      ),
    );

    expect((await menusOn(date)).body).toEqual([
      {
        restaurant: '수의대식당',
        operatingHours: '※ 운영시간 : 11:00~14:30',
        collectedAt: '2026-10-31T12:00:00.000Z',
        meals: [{ meal: 'lunch', entries: [{ name: '제육볶음', price: 6000 }] }],
      },
      {
        restaurant: '학생회관식당',
        operatingHours: null,
        collectedAt: '2026-11-01T00:00:00.000Z',
        meals: [{ meal: 'lunch', entries: [{ name: '김치찌개', price: 5500 }] }],
      },
    ]);
    expect((await menusOn(otherDate)).body).toMatchObject([{ restaurant: '학생회관식당' }]);
  });
});

// A valid restaurant, then one with `changes`, so that storing nothing is seen.
function secondChanged(date: string, changes: object): object {
  return menusMessage([restaurantMenus(date), restaurantMenus(date, { restaurant: '자하연식당', ...changes })]);
}

// The problem, the message and what the answer names.
const invalidMenus: [string, (date: string) => object, string][] = [
  [
    'a meal that is not breakfast, lunch or dinner',
    (date: string): object => secondChanged(date, { entries: [{ meal: 'brunch', name: '토스트', price: 3000 }] }),
    'menus.1.entries.0.meal: ',
  ],
  [
    'a price written as text',
    (date: string): object => secondChanged(date, { entries: [{ meal: 'lunch', name: '돈까스', price: '5,500원' }] }),
    'menus.1.entries.0.price: ',
  ],
  [
    'a price too large to store',
    (date: string): object => secondChanged(date, { entries: [{ meal: 'lunch', name: '돈까스', price: 2 ** 31 }] }),
    'menus.1.entries.0.price: ',
  ],
  [
    'a day that is not a calendar day',
    (date: string): object => secondChanged(date, { date: '11. 3(월)' }),
    'menus.1.date: ',
  ],
  [
    'a field the schema does not know',
    (date: string): object => secondChanged(date, { hours: '11:00~14:30' }),
    'menus.1: ',
  ],
  [
    'the same restaurant and day twice',
    (date: string): object => menusMessage([restaurantMenus(date), restaurantMenus(date)]),
    'menus: Each restaurant and day must appear once',
  ],
  [
    'no collection time',
    (date: string): object => menusMessage([restaurantMenus(date)], { collectedAt: undefined }),
    'collectedAt: ',
  ],
  [
    'a source that has no menus',
    (date: string): object => menusMessage([restaurantMenus(date)], { source: 'events' }),
    'source: ',
  ],
];

describe('A menus message that does not match the schema', () => {
  it.each(invalidMenus)(
    'is refused when it has %s, and nothing from it is stored',
    async (_problem, message, named) => {
      const date = newDay();
      const status = await prisma.collectionStatus.findUnique({ where: { source: 'coop_menus' } });

      expect(await refusal(harness.worker, 'menus-collected', message(date))).toContain(named);
      expect((await menusOn(date)).body).toEqual([]);
      expect(await prisma.collectionStatus.findUnique({ where: { source: 'coop_menus' } })).toEqual(status);
    },
  );
});

describe("A User's menus route", () => {
  it('answers an empty list for a day with nothing stored', async () => {
    const response = await menusOn(newDay());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('refuses a request without an access token', async () => {
    const response = await request(harness.app.getHttpServer()).get('/menus').query({ date: newDay() });

    expect(response.status).toBe(401);
  });

  it('refuses a day that is not a calendar day', async () => {
    const response = await menusOn('2026-11-31');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: [expect.stringContaining('Invalid ISO date')] });
  });
});
