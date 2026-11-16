/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { type Position } from '../src/common/geometry.js';
import { signInUser, type TestUser } from './friends.js';
import { expectStatus } from './location-sharing.js';
import { addZone, deleteZone, listZones, placePoint } from './private-zones.js';
import { ANY_STRING, refused } from './signals.js';
import { startApp } from './start-app.js';
import { circleRound, squareRound } from './zone-shapes.js';

// The User's own Private Zones through GET, POST and DELETE /users/me/private-zones, round the seed's 301동.

const settings = inject('settings');
let app: INestApplication<Server>;
let place301: Position;

beforeAll(async () => {
  app = await startApp(settings);
  place301 = await placePoint(app, await signInUser(app), '301');
});

afterAll(async () => {
  await app.close();
});

const zoneRound301 = (side = 100): Position[] => squareRound(place301, side);

async function zonesOf(user: TestUser): Promise<unknown> {
  const response = await expectStatus(listZones(app, user), 200);
  return response.body;
}

const idOf = (body: unknown): string => z.object({ id: z.string() }).parse(body).id;

describe('A Private Zone', () => {
  it('is made with the label of the Place nearest its middle, and listed oldest first', async () => {
    const user = await signInUser(app);
    const first = zoneRound301();
    const second = zoneRound301(60);

    const made = await addZone(app, user, { outline: first });
    await expectStatus(addZone(app, user, { outline: second }), 201);

    expect(made.status).toBe(201);
    expect(made.body).toEqual({ id: ANY_STRING, label: '301동 근처', outline: first, createdAt: ANY_STRING });
    expect(await zonesOf(user)).toEqual({
      zones: [made.body, { id: ANY_STRING, label: '301동 근처', outline: second, createdAt: ANY_STRING }],
    });
  });

  it('is kept without a last point that repeats the first', async () => {
    const user = await signInUser(app);
    const outline = zoneRound301();

    const made = await addZone(app, user, { outline: [...outline, outline[0]] });

    expect(made.status).toBe(201);
    expect(made.body).toMatchObject({ outline });
  });
});

describe('Deleting a Private Zone', () => {
  it('by its owner leaves it listed no more', async () => {
    const user = await signInUser(app);
    const id = idOf((await expectStatus(addZone(app, user, { outline: zoneRound301() }), 201)).body);

    expect((await deleteZone(app, user, id)).status).toBe(204);
    expect(await zonesOf(user)).toEqual({ zones: [] });
    expect((await deleteZone(app, user, id)).body).toMatchObject(refused(404, 'PRIVATE_ZONE_NOT_FOUND'));
  });

  it('of another User is 404, and that zone is never listed to them', async () => {
    const [owner, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const made = await expectStatus(addZone(app, owner, { outline: zoneRound301() }), 201);
    const id = idOf(made.body);

    expect(await zonesOf(other)).toEqual({ zones: [] });
    const response = await deleteZone(app, other, id);
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'PRIVATE_ZONE_NOT_FOUND'));
    expect(await zonesOf(owner)).toEqual({ zones: [made.body] });
    expect((await deleteZone(app, owner, randomUUID())).status).toBe(404);
  });
});

describe('A sixth Private Zone', () => {
  it('is refused with 409 PRIVATE_ZONES_FULL', async () => {
    const user = await signInUser(app);
    await Promise.all(
      [100, 90, 80, 70, 60].map((side) => expectStatus(addZone(app, user, { outline: zoneRound301(side) }), 201)),
    );

    const response = await addZone(app, user, { outline: zoneRound301(50) });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PRIVATE_ZONES_FULL'));
    expect(z.object({ zones: z.array(z.unknown()) }).parse(await zonesOf(user)).zones).toHaveLength(5);
  });
});

// 서울역, far from the campus.
const FAR_AWAY = { latitude: 37.5547, longitude: 126.9707 };

describe('An outline refused with 400', () => {
  it.each([
    ['without an outline', (): object => ({}), 'PRIVATE_ZONE_INVALID'],
    ['of two points', (): object => ({ outline: zoneRound301().slice(0, 2) }), 'PRIVATE_ZONE_INVALID'],
    ['of 201 points', (): object => ({ outline: circleRound(place301, 50, 201) }), 'PRIVATE_ZONE_INVALID'],
    [
      'with a point that is not one',
      (): object => ({ outline: [...zoneRound301(), { latitude: 91, longitude: 0 }] }),
      'PRIVATE_ZONE_INVALID',
    ],
    ['far from the campus', (): object => ({ outline: squareRound(FAR_AWAY, 100) }), 'PRIVATE_ZONE_OFF_CAMPUS'],
    ['round less than 300 m²', (): object => ({ outline: zoneRound301(15) }), 'PRIVATE_ZONE_TOO_SMALL'],
  ])('%s', async (_case, body, code) => {
    const user = await signInUser(app);

    const response = await addZone(app, user, body());

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(refused(400, code));
    expect(await zonesOf(user)).toEqual({ zones: [] });
  });
});
