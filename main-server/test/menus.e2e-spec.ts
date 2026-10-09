// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-02 to 2026-10-08, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #26 #31
import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { daysOf, getMenus, menusMessage, restaurant, servedLunch } from './menus.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { refusal, sendAsWorker } from './worker.js';

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
  await Promise.all([prisma.$disconnect(), app.close()]);
});

const newDay = daysOf('2026-11');

function menusOn(date: string): request.Test {
  return getMenus(app, accessToken, date);
}

// A cell of several kinds of line, as the Co-op page writes them, across the three meals.
const selfServiceLines = [
  { meal: 'lunch', text: '<셀프코너> 7,000원', kind: 'heading', name: null, price: 7000 },
  { meal: 'lunch', text: '잡곡밥', kind: null, name: null, price: null },
  { meal: 'breakfast', text: '토스트 : 3,000원', kind: 'dish', name: '토스트', price: 3000 },
  { meal: 'lunch', text: '※운영시간 : 11:00~14:00', kind: 'note', name: null, price: null },
  { meal: 'dinner', text: '한입버거운시그니처버거 : 9,900원 / 12,400원', kind: 'dish', name: null, price: null },
];

describe('Menus collected by the worker', () => {
  it('are stored and served by restaurant and meal, each line as it was sent', async () => {
    const date = newDay();
    const message = menusMessage([
      { date, restaurants: [restaurant(), restaurant({ name: '두레미담', lines: selfServiceLines })] },
    ]);

    await expect(sendAsWorker(app, '/menus/collected', message)).resolves.toBeUndefined();

    const response = await menusOn(date);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        name: '두레미담',
        collectedAt: '2026-10-31T12:00:00.000Z',
        meals: [
          { meal: 'breakfast', lines: [{ text: '토스트 : 3,000원', kind: 'dish', name: '토스트', price: 3000 }] },
          {
            meal: 'lunch',
            lines: [
              { text: '<셀프코너> 7,000원', kind: 'heading', name: null, price: 7000 },
              { text: '잡곡밥', kind: null, name: null, price: null },
              { text: '※운영시간 : 11:00~14:00', kind: 'note', name: null, price: null },
            ],
          },
          {
            meal: 'dinner',
            lines: [{ text: '한입버거운시그니처버거 : 9,900원 / 12,400원', kind: 'dish', name: null, price: null }],
          },
        ],
      },
      { name: '학생회관식당', collectedAt: '2026-10-31T12:00:00.000Z', meals: [servedLunch] },
    ]);
  });
});

describe('A restaurant the page lists without a menu', () => {
  it('is served without meals when its cells are empty, and with the closure line when a cell has one', async () => {
    const date = newDay();
    const closure = { meal: 'lunch', text: '개천절 휴무', kind: 'note', name: null, price: null };

    await sendAsWorker(
      app,
      '/menus/collected',
      menusMessage([
        { date, restaurants: [restaurant({ lines: [closure] }), restaurant({ name: '자하연식당 2층', lines: [] })] },
      ]),
    );

    expect((await menusOn(date)).body).toEqual([
      { name: '자하연식당 2층', collectedAt: '2026-10-31T12:00:00.000Z', meals: [] },
      {
        name: '학생회관식당',
        collectedAt: '2026-10-31T12:00:00.000Z',
        meals: [{ meal: 'lunch', lines: [{ text: '개천절 휴무', kind: 'note', name: null, price: null }] }],
      },
    ]);
  });
});

describe('The same menus message twice', () => {
  it('is stored once', async () => {
    const date = newDay();
    const message = menusMessage([{ date, restaurants: [restaurant()] }]);

    await sendAsWorker(app, '/menus/collected', message);
    await sendAsWorker(app, '/menus/collected', message);

    expect((await menusOn(date)).body).toEqual([
      { name: '학생회관식당', collectedAt: '2026-10-31T12:00:00.000Z', meals: [servedLunch] },
    ]);
  });
});

describe('A later Collection of a Source', () => {
  it('replaces everything the Source stored for the day, and leaves its other day and the other Sources', async () => {
    const [date, otherDate] = [newDay(), newDay()];
    await sendAsWorker(
      app,
      '/menus/collected',
      menusMessage([
        { date, restaurants: [restaurant(), restaurant({ name: '자하연식당 2층' })] },
        { date: otherDate, restaurants: [restaurant()] },
      ]),
    );
    await sendAsWorker(
      app,
      '/menus/collected',
      menusMessage([{ date, restaurants: [restaurant({ name: '수의대식당' })] }], { source: 'veterinary_menus' }),
    );

    // The page dropped 자하연식당 2층 and changed the other restaurant's lines.
    const changed = { text: '김치찌개 : 5,500원', kind: 'dish', name: '김치찌개', price: 5500 };
    await sendAsWorker(
      app,
      '/menus/collected',
      menusMessage([{ date, restaurants: [restaurant({ lines: [{ meal: 'lunch', ...changed }] })] }], {
        collectedAt: '2026-11-01T10:00:00+09:00',
      }),
    );

    expect((await menusOn(date)).body).toEqual([
      { name: '수의대식당', collectedAt: '2026-10-31T12:00:00.000Z', meals: [servedLunch] },
      {
        name: '학생회관식당',
        collectedAt: '2026-11-01T01:00:00.000Z',
        meals: [{ meal: 'lunch', lines: [changed] }],
      },
    ]);
    expect((await menusOn(otherDate)).body).toEqual([
      { name: '학생회관식당', collectedAt: '2026-10-31T12:00:00.000Z', meals: [servedLunch] },
    ]);
  });

  it('empties a day on which the page lists no restaurant any more', async () => {
    const date = newDay();
    await sendAsWorker(app, '/menus/collected', menusMessage([{ date, restaurants: [restaurant()] }]));

    await sendAsWorker(app, '/menus/collected', menusMessage([{ date, restaurants: [] }]));

    expect((await menusOn(date)).body).toEqual([]);
  });
});

// A time no stored message of this file carries, so that a success recorded for a refused message would be seen.
const refusedAt = { collectedAt: '2026-11-30T05:00:00+09:00' };

// A valid restaurant, then one with `changes`, so that storing nothing is seen.
function secondChanged(date: string, changes: object): object {
  return menusMessage(
    [{ date, restaurants: [restaurant(), restaurant({ name: '자하연식당 2층', ...changes })] }],
    refusedAt,
  );
}

// A second restaurant whose one line has `changes`.
function lineChanged(date: string, changes: object): object {
  return secondChanged(date, {
    lines: [{ meal: 'lunch', text: '돈까스 : 5,500원', kind: 'dish', name: '돈까스', price: 5500, ...changes }],
  });
}

// The problem, the message and what the answer names.
const invalidMenus: [string, (date: string) => object, string][] = [
  [
    'a kind of line the schema does not know',
    (date: string): object => lineChanged(date, { kind: 'corner' }),
    'days.0.restaurants.1.lines.0.kind: ',
  ],
  [
    'a price too large to store',
    (date: string): object => lineChanged(date, { price: 2 ** 31 }),
    'days.0.restaurants.1.lines.0.price: ',
  ],
  [
    'a line without the name of its dish, as a worker of an older shape sends it',
    (date: string): object => lineChanged(date, { name: undefined }),
    'days.0.restaurants.1.lines.0.name: ',
  ],
  [
    'a field the schema does not know',
    (date: string): object => secondChanged(date, { operatingHours: '※ 운영시간 : 11:00~14:30' }),
    'days.0.restaurants.1: ',
  ],
  [
    'a day that is not a calendar day',
    (date: string): object =>
      menusMessage(
        [
          { date, restaurants: [restaurant()] },
          { date: '11. 3(월)', restaurants: [] },
        ],
        refusedAt,
      ),
    'days.1.date: ',
  ],
  [
    'the same restaurant twice on a day',
    (date: string): object => menusMessage([{ date, restaurants: [restaurant(), restaurant()] }], refusedAt),
    'days.0.restaurants: Each restaurant must appear once',
  ],
  [
    'the same day twice',
    (date: string): object =>
      menusMessage(
        [
          { date, restaurants: [restaurant()] },
          { date, restaurants: [] },
        ],
        refusedAt,
      ),
    'days: Each day must appear once',
  ],
  [
    'no time of collection',
    (date: string): object => menusMessage([{ date, restaurants: [restaurant()] }], { collectedAt: undefined }),
    'collectedAt: ',
  ],
  [
    'a Source that has no menus',
    (date: string): object => menusMessage([{ date, restaurants: [restaurant()] }], { ...refusedAt, source: 'events' }),
    'source: ',
  ],
];

describe('A menus message that does not match the schema', () => {
  it.each(invalidMenus)(
    'is refused when it has %s, and nothing from it is stored',
    async (_problem, message, named) => {
      const date = newDay();
      const status = await prisma.collectionStatus.findUnique({ where: { source: 'coop_menus' } });

      expect(await refusal(app, '/menus/collected', message(date))).toContain(named);
      expect((await menusOn(date)).body).toEqual([]);
      expect(await prisma.collectionStatus.findUnique({ where: { source: 'coop_menus' } })).toEqual(status);
    },
  );
});

describe("A User's menus route", () => {
  it('lists the restaurants in the Korean order of their names', async () => {
    const date = newDay();
    const names = ['학생회관식당', '자하연식당 2층', '아워홈(901동)', '3식당'];
    await sendAsWorker(
      app,
      '/menus/collected',
      menusMessage([{ date, restaurants: names.map((name) => restaurant({ name })) }]),
    );

    const response = await menusOn(date);

    expect(response.body).toMatchObject([
      { name: '3식당' },
      { name: '아워홈(901동)' },
      { name: '자하연식당 2층' },
      { name: '학생회관식당' },
    ]);
  });

  it('answers an empty list for a day with nothing stored', async () => {
    const response = await menusOn(newDay());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('refuses a request without an access token', async () => {
    const response = await request(app.getHttpServer()).get('/menus').query({ date: newDay() });

    expect(response.status).toBe(401);
  });

  it('refuses a day that is not a calendar day', async () => {
    const response = await menusOn('2026-11-31');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: [expect.stringContaining('Invalid ISO date')] });
  });
});
