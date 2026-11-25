/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { readSeedTravel } from '../src/travel/travel.js';
import { placeNumbered, type SeedPlace } from './friend-levels.js';
import { type TestUser } from './friends.js';
import { expectStatus, getPositions, sharingFriends, uploadPosition } from './location-sharing.js';
import { startApp } from './start-app.js';

// The committed walking table through the app (P04 ticket 77): a Friend's walk on GET /positions, from the Place nearest
// the viewer to the Place nearest the Friend, counts the climb by Tobler's function, so it differs up and down. On the
// seed's Travel Times, not the frozen ones the other tests bind. Expected values, checked by hand against the table:
// (관악사)학부 생활관 (919) → 제2공학관 (302) 1,652 s, 28 minutes shown; back 1,164 s, 20 minutes; both 1,333 s, 23
// minutes, before.

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings, [], undefined, undefined, [], await readSeedTravel(SEED_DIRECTORY));
});

afterAll(async () => {
  await app.close();
});

// A hair from a Place's point, with more digits than the seed gives any Place.
function at({ latitude, longitude }: SeedPlace): { latitude: number; longitude: number } {
  return { latitude: latitude + 0.0000012345, longitude: longitude + 0.0000012345 };
}

async function onlyPosition(viewer: TestUser): Promise<unknown> {
  const response = await expectStatus(getPositions(app, viewer), 200);
  const body: unknown = response.body;
  return z.array(z.unknown()).length(1).parse(body)[0];
}

async function walkShown(from: string, to: string): Promise<unknown> {
  const [viewer, friend] = await sharingFriends(app);
  const [origin, destination] = await Promise.all([placeNumbered(app, viewer, from), placeNumbered(app, viewer, to)]);
  await expectStatus(uploadPosition(app, viewer, at(origin)), 200);
  await expectStatus(uploadPosition(app, friend, at(destination)), 200);
  return onlyPosition(viewer);
}

// Partitions: the walk up a hill and the walk down it.
describe('a Friend’s walk on the committed walking table', () => {
  it('is 28 minutes up from 919 to a Friend at 302', async () => {
    expect(await walkShown('919', '302')).toMatchObject({ walkMinutes: 28 });
  });

  it('is 20 minutes down from 302 to a Friend at 919', async () => {
    expect(await walkShown('302', '919')).toMatchObject({ walkMinutes: 20 });
  });
});
