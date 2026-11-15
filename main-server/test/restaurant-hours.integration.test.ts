/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { type RestaurantHours } from '../src/menus/restaurant-hours.js';
import { menusMessage } from './menus.js';
import { startApp } from './start-app.js';
import { refusal, sendAsWorker } from './worker.js';

let app: INestApplication<Server>;
let restaurantHours: RestaurantHours;
// The tests read the kept rows with a connection of their own.
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  // Imported after startApp, so that it is the class AppModule registers.
  const { RestaurantHours } = await import('../src/menus/restaurant-hours.js');
  restaurantHours = app.get(RestaurantHours);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
});

afterAll(async () => {
  await Promise.all([prisma.$disconnect(), app.close()]);
});

// Days of June 2027, which no other test file stores menus for. Kept hours belong to a Restaurant, not to a day, so
// each test takes a Restaurant of its own.
const TUESDAY = '2027-06-01';
const THURSDAY = '2027-06-03';
const FRIDAY = '2027-06-04';
const SATURDAY = '2027-06-05';
const SUNDAY = '2027-06-06';
const MONDAY = '2027-06-07';

interface Hours {
  meal: 'breakfast' | 'lunch' | 'dinner';
  opensAt: string;
  closesAt: string;
  line: string;
}

function hours(meal: Hours['meal'], opensAt: string, closesAt: string, line?: string): Hours {
  return { meal, opensAt, closesAt, line: line ?? `※ 운영시간 : ${opensAt}~${closesAt}` };
}

// A restaurant as the worker reads it: a dish and the hours line of each meal it has hours for.
function restaurant(name: string, mealHours: Hours[]): object {
  return {
    name,
    lines: mealHours.flatMap(({ meal, line }) => [
      { meal, text: '제육볶음 : 6,000원', kind: 'dish', name: '제육볶음', price: 6000 },
      { meal, text: line, kind: 'note', name: null, price: null },
    ]),
    hours: mealHours,
  };
}

function lunchHours(name: string, opensAt: string, closesAt: string, line?: string): object {
  return restaurant(name, [hours('lunch', opensAt, closesAt, line)]);
}

function keptRows(name: string): Promise<object[]> {
  return prisma.restaurantHours.findMany({
    where: { restaurant: name },
    orderBy: [{ meal: 'asc' }, { dayKind: 'asc' }],
    omit: { id: true },
  });
}

// Sends one Collection of the Co-op's menus, collected at `collectedAt` in Korea time.
function collect(days: { date: string; restaurants: object[] }[], collectedAt = '2027-06-01T05:00:00'): Promise<void> {
  return sendAsWorker(app, '/menus/collected', menusMessage(days, { collectedAt: `${collectedAt}+09:00` }));
}

describe('A Collection with the hours of a Restaurant', () => {
  it('keeps them by meal and kind of day, with the line they were read from', async () => {
    const [lunch, dinner] = [hours('lunch', '11:00', '14:30'), hours('dinner', '17:00', '19:00')];
    const saturdayLunch = hours('lunch', '11:00', '14:00');
    await collect(
      [
        { date: THURSDAY, restaurants: [restaurant('학생회관식당', [lunch, dinner])] },
        { date: SATURDAY, restaurants: [restaurant('학생회관식당', [saturdayLunch])] },
        // The page lists the Restaurant on Sunday without a menu.
        { date: SUNDAY, restaurants: [{ name: '학생회관식당', lines: [], hours: [] }] },
      ],
      '2027-06-03T05:00:00',
    );

    const kept = { source: 'coop_menus', restaurant: '학생회관식당', readAt: new Date('2027-06-02T20:00:00Z') };
    expect(await keptRows('학생회관식당')).toEqual([
      { ...kept, ...lunch, dayKind: 'weekday' },
      { ...kept, ...saturdayLunch, dayKind: 'saturday' },
      { ...kept, ...dinner, dayKind: 'weekday' },
    ]);
  });
});

describe('A Collection whose days read different hours for one kind of day', () => {
  it("keeps the earliest day's", async () => {
    await collect([
      { date: FRIDAY, restaurants: [lunchHours('자하연식당 2층', '11:30', '13:00')] },
      { date: THURSDAY, restaurants: [lunchHours('자하연식당 2층', '11:30', '14:00')] },
    ]);

    expect(await keptRows('자하연식당 2층')).toMatchObject([
      { dayKind: 'weekday', opensAt: '11:30', closesAt: '14:00' },
    ]);
  });
});

describe('A later Collection', () => {
  it('replaces kept hours only when it reads other times', async () => {
    const first = '※ 운영시간 : 11:00~14:00';
    await collect([{ date: TUESDAY, restaurants: [lunchHours('두레미담', '11:00', '14:00', first)] }]);
    // The same times, written another way.
    const again = lunchHours('두레미담', '11:00', '14:00', '※운영시간: 11:00~14:00');
    await collect([{ date: TUESDAY, restaurants: [again] }], '2027-06-01T10:00:00');

    expect(await keptRows('두레미담')).toMatchObject([{ line: first, readAt: new Date('2027-05-31T20:00:00Z') }]);

    await collect([{ date: MONDAY, restaurants: [lunchHours('두레미담', '11:00', '13:30')] }], '2027-06-07T05:00:00');

    expect(await keptRows('두레미담')).toMatchObject([
      { closesAt: '13:30', line: '※ 운영시간 : 11:00~13:30', readAt: new Date('2027-06-06T20:00:00Z') },
    ]);
  });

  it("leaves the kept hours when the day's page gives no hours line", async () => {
    await collect([{ date: TUESDAY, restaurants: [lunchHours('302동식당', '11:30', '13:30')] }]);
    const closure = { meal: 'lunch', text: '개천절 휴무', kind: 'note', name: null, price: null };
    await collect([{ date: MONDAY, restaurants: [{ name: '302동식당', lines: [closure], hours: [] }] }]);

    expect(await keptRows('302동식당')).toMatchObject([{ opensAt: '11:30', closesAt: '13:30' }]);
  });
});

describe('Hours that are not times of day', () => {
  it('are refused', async () => {
    const message = menusMessage([{ date: TUESDAY, restaurants: [lunchHours('동원관식당', '11:00', '24:00')] }]);

    expect(await refusal(app, '/menus/collected', message)).toContain('days.0.restaurants.0.hours.0.closesAt: ');
  });
});

describe("A Restaurant's hours for a meal on a date", () => {
  it('are the hours kept for the kind of day the date is, in Korea', async () => {
    await collect([
      { date: THURSDAY, restaurants: [lunchHours('3식당', '11:00', '14:00')] },
      { date: SATURDAY, restaurants: [lunchHours('3식당', '11:30', '13:30')] },
    ]);

    expect(await restaurantHours.hoursOf('3식당', 'lunch', MONDAY)).toEqual({ opensAt: '11:00', closesAt: '14:00' });
    expect(await restaurantHours.hoursOf('3식당', 'lunch', FRIDAY)).toEqual({ opensAt: '11:00', closesAt: '14:00' });
    expect(await restaurantHours.hoursOf('3식당', 'lunch', SATURDAY)).toEqual({ opensAt: '11:30', closesAt: '13:30' });
  });

  it('are none for a kind of day, a meal or a Restaurant never read', async () => {
    await collect([{ date: THURSDAY, restaurants: [lunchHours('301동식당', '11:30', '13:30')] }]);

    expect(await restaurantHours.hoursOf('301동식당', 'lunch', SUNDAY)).toBeNull();
    expect(await restaurantHours.hoursOf('301동식당', 'dinner', THURSDAY)).toBeNull();
    expect(await restaurantHours.hoursOf('수의대식당', 'lunch', THURSDAY)).toBeNull();
  });
});
