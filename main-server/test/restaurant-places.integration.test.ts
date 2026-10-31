/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { daysOf, getMenus, menusMessage, restaurant, servedLunch } from './menus.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';
import { sendAsWorker } from './worker.js';

// Each Restaurant's Place on `GET /menus`, from the restaurant seed.

const PLACES = {
  학생회관식당: '63',
  '자하연식당 2층': '109',
  '자하연식당 3층': '109',
  예술계식당: '74',
  두레미담: '75-1',
  '3식당': '75-1',
  동원관식당: '113',
  '301동식당': '301',
  '302동식당': '302',
  '아워홈(901동)': '901',
  '생협기숙사(919동)': '919',
  수의대식당: '85',
};

let app: INestApplication<Server>;
let accessToken: string;
let placeIds: Map<string | null, string>;

const placesSchema = z.array(z.object({ id: z.string(), number: z.string().nullable() }));

beforeAll(async () => {
  app = await startApp(inject('settings'));
  ({ accessToken } = await signIn(app));
  const places = await request(app.getHttpServer()).get('/places').auth(accessToken, { type: 'bearer' });
  placeIds = new Map(placesSchema.parse(places.body).map(({ id, number }) => [number, id]));
});

afterAll(async () => {
  await app.close();
});

const newDay = daysOf('2027-03');

const servedSchema = z.array(z.object({ name: z.string(), placeId: z.string().nullable() }));

describe("A Restaurant's Place", () => {
  it('is the Place of its number in the seed, for each of the 12 Restaurants', async () => {
    const date = newDay();
    const restaurants = Object.keys(PLACES).map((name) => restaurant({ name }));

    await sendAsWorker(app, '/menus/collected', menusMessage([{ date, restaurants }]));

    const response = await getMenus(app, accessToken, date);
    const shown = Object.fromEntries(servedSchema.parse(response.body).map(({ name, placeId }) => [name, placeId]));
    expect(shown).toEqual(
      Object.fromEntries(Object.entries(PLACES).map(([name, number]) => [name, placeIds.get(number)])),
    );
    expect(Object.values(shown).every((id) => typeof id === 'string')).toBe(true);
  });

  it('is none for a Restaurant the seed does not hold', async () => {
    const date = newDay();
    const restaurants = [restaurant({ name: '감골식당' })];

    await sendAsWorker(app, '/menus/collected', menusMessage([{ date, restaurants }]));

    expect((await getMenus(app, accessToken, date)).body).toEqual([
      { name: '감골식당', placeId: null, collectedAt: '2026-10-31T12:00:00.000Z', meals: [servedLunch] },
    ]);
  });
});
