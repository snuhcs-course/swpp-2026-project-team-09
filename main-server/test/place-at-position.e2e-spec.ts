// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #36
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { signIn, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// The global setup loaded the seed into the shared database, and the server reads the Places when it starts.

let app: INestApplication<Server>;
let accessToken: string;
// 제1공학관, as the list of Places gives it.
let engineeringBuilding1: unknown;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  ({ accessToken } = await signIn(app));
  const search = request(app.getHttpServer()).get('/places/search').query({ q: '301' });
  [engineeringBuilding1] = z
    .array(z.unknown())
    .length(1)
    .parse((await withAccessToken(search, accessToken)).body);
});

afterAll(async () => {
  await app.close();
});

function getPlaceAt(token: string | undefined, query: object): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/places/at').query(query), token);
}

describe("A User's Place at a position", () => {
  it('is the Place whose outline holds the position, as the list gives it', async () => {
    const response = await getPlaceAt(accessToken, { latitude: '37.45016', longitude: '126.95259' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ place: engineeringBuilding1, relation: 'inside' });
    expect(response.body).toMatchObject({ place: { number: '301', name: '제1공학관' } });
  });

  it('is a Place nearby up to 20 m from its wall', async () => {
    // 12 m west of 제1공학관's longest wall.
    const response = await getPlaceAt(accessToken, { latitude: '37.4502049', longitude: '126.9521564' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ place: engineeringBuilding1, relation: 'near' });
  });

  it('is none when every Place is farther than 20 m', async () => {
    // On the slope east of the engineering buildings, 83 m from the nearest outline.
    const response = await getPlaceAt(accessToken, { latitude: '37.453', longitude: '126.956' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ place: null, relation: 'none' });
  });

  it('is, where the outlines of two Places hold the position, the one that comes first in the list', async () => {
    // The stand of 종합운동장, inside the outlines of 종합운동장본부석 (149동) and of 종합운동장.
    const response = await getPlaceAt(accessToken, { latitude: '37.464447', longitude: '126.950667' });

    expect(response.body).toMatchObject({ place: { number: '149', name: '종합운동장본부석' }, relation: 'inside' });
  });

  it('refuses a request without an access token', async () => {
    const response = await getPlaceAt(undefined, { latitude: '37.45016', longitude: '126.95259' });

    expect(response.status).toBe(401);
  });
});

// The problem, the query and the field the answer names.
const invalidCoordinates: [string, Record<string, string>, string][] = [
  ['no latitude', { longitude: '126.95259' }, 'latitude: '],
  ['a longitude that is not a number', { latitude: '37.45016', longitude: '126.9E' }, 'longitude: '],
  ['an empty latitude', { latitude: '', longitude: '126.95259' }, 'latitude: '],
  ['the latitude and the longitude swapped', { latitude: '126.95259', longitude: '37.45016' }, 'latitude: '],
  ['a longitude past 180°', { latitude: '37.45016', longitude: '180.5' }, 'longitude: '],
];

describe("A User's Place at a position given wrongly", () => {
  it.each(invalidCoordinates)('answers 400 to %s and names the field', async (_problem, query, field) => {
    const response = await getPlaceAt(accessToken, query);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: [expect.stringContaining(field)] });
  });
});
