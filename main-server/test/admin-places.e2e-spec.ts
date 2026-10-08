import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { signIn, signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

// The global setup loaded the seed into the shared database.

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

const ringSchema = z.array(z.strictObject({ latitude: z.number(), longitude: z.number() }));

const adminPlacesSchema = z.array(
  z.strictObject({
    id: z.uuid(),
    number: z.string().nullable(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    origin: z.enum(['campus_map', 'openstreetmap', 'national_map']),
    outlines: z.array(ringSchema),
  }),
);

async function adminPlaces(): Promise<z.infer<typeof adminPlacesSchema>> {
  const administrator = await signInAsAdministrator(app);
  const response = await request(app.getHttpServer())
    .get('/admin/places')
    .auth(administrator.accessToken, { type: 'bearer' });
  expect(response.status).toBe(200);
  return adminPlacesSchema.parse(response.body);
}

describe("An Administrator's list of Places", () => {
  it("answers every Place in the order of a User's list, with its origin and its outlines", async () => {
    const user = await signIn(app);
    const places = await adminPlaces();
    const listed = await request(app.getHttpServer()).get('/places').auth(user.accessToken, { type: 'bearer' });

    expect(places).toHaveLength(230);
    expect(places.map(({ origin: _origin, outlines: _outlines, ...place }) => place)).toEqual(listed.body);
    expect(
      z
        .array(z.record(z.string(), z.unknown()))
        .parse(listed.body)
        .some((place) => 'outlines' in place),
    ).toBe(false);
  });

  it('answers the outline a Place has, the one OpenStreetMap gives 100, and none for 253', async () => {
    const places = await adminPlaces();
    const numbered = (number: string): (typeof places)[number] | undefined =>
      places.find((place) => place.number === number);

    expect(numbered('301')).toMatchObject({ name: '제1공학관', origin: 'campus_map' });
    expect(numbered('301')?.outlines.length).toBeGreaterThan(0);
    expect(numbered('100')?.outlines).toHaveLength(1);
    expect(numbered('100')?.outlines[0]?.length).toBeGreaterThan(3);
    expect(numbered('253')?.outlines).toEqual([]);
  });

  it("refuses a User's token", async () => {
    const { accessToken } = await signIn(app);

    const response = await request(app.getHttpServer()).get('/admin/places').auth(accessToken, { type: 'bearer' });

    expect(response.status).toBe(401);
  });
});
