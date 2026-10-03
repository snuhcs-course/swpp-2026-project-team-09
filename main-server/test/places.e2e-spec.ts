import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';

// The global setup loaded the seed into the shared database.

let app: INestApplication<Server>;
let accessToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  ({ accessToken } = await signIn(app));
});

afterAll(async () => {
  await app.close();
});

// A list of Places as the routes serve it, exactly.
const placesSchema = z.array(
  z.strictObject({
    id: z.uuid(),
    number: z.string().nullable(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
);

type Places = z.infer<typeof placesSchema>;

function asUser(path: string, query: object = {}): request.Test {
  return request(app.getHttpServer()).get(path).query(query).auth(accessToken, { type: 'bearer' });
}

async function served(path: string, query: object = {}): Promise<Places> {
  const response = await asUser(path, query);
  expect(response.status).toBe(200);
  return placesSchema.parse(response.body);
}

describe("A User's list of Places", () => {
  it('lists each Place with its number, name and coordinates, in the order of the numbers', async () => {
    const places = await served('/places');

    expect(places).toHaveLength(226);
    expect(places.slice(0, 3)).toMatchObject([
      { number: '1', name: '인문관1', latitude: 37.46027, longitude: 126.95234 },
      { number: '2', name: '인문관2', latitude: 37.46038, longitude: 126.95295 },
      { number: '3', name: '인문관3', latitude: 37.46071, longitude: 126.95355 },
    ]);
    const numbers = places.map(({ number }) => number);
    expect(numbers.slice(numbers.indexOf('71'), numbers.indexOf('71') + 3)).toEqual(['71', '71-1', '71-2']);
  });

  it('ends with the Places that have no number, in the Korean order of their names', async () => {
    const places = await served('/places');

    expect(places.slice(-8)).toMatchObject(
      ['공대테니스장', '관악사운동장', '붉은광장', '서울대 정문', '야구장', '자하연', '종합운동장', '테니스장'].map(
        (name) => ({ number: null, name }),
      ),
    );
  });

  it('refuses a request without an access token', async () => {
    const response = await request(app.getHttpServer()).get('/places');

    expect(response.status).toBe(401);
  });
});

describe("A User's search of the Places", () => {
  it('finds the Places whose name holds the text, in the order of the numbers', async () => {
    const places = await served('/places/search', { q: '공학관' });

    expect(places.map(({ number, name }) => `${number} ${name}`)).toEqual([
      '30 공학관1',
      '31 공학관2',
      '32 공학관3',
      '33 공학관4',
      '34 공학관5',
      '35 공학관6',
      '36 공학관7',
      '37 공학관8',
      '301 제1공학관',
      '302 제2공학관',
    ]);
  });

  it('finds a Place by its number, written with or without 동', async () => {
    const places = await served('/places/search', { q: '302' });

    expect(places).toMatchObject([{ number: '302', name: '제2공학관', latitude: 37.44887, longitude: 126.95265 }]);
    expect(await served('/places/search', { q: '302동' })).toEqual(places);
  });

  it('ignores the case of Latin letters', async () => {
    const places = await served('/places/search', { q: 'Lg' });

    expect(places.map(({ name }) => name)).toEqual(['LG경영관(경영연구관및산학협동관)', 'LG연구동']);
  });

  it('refuses a request without an access token', async () => {
    const response = await request(app.getHttpServer()).get('/places/search').query({ q: '302' });

    expect(response.status).toBe(401);
  });

  it('refuses a search without text', async () => {
    const response = await asUser('/places/search', { q: ' ' });

    expect(response.status).toBe(400);
  });
});
