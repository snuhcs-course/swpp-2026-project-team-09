/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { readSeedFile, SEED_DIRECTORY } from '../src/common/seed-directory.js';
import { WALKING_TABLE_FILE, walkingTableSchema } from '../src/travel/walking-table.js';
import { IN_LIBRARY, placeNumbered, type SeedPlace } from './friend-levels.js';
import { befriend, type TestUser } from './friends.js';
import { expectStatus, getPositions, shareAt, sharingFriends, uploadPosition } from './location-sharing.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await app.close();
});

// A hair from the point of 제1공학관 (301).
const IN_ENGINEERING = { latitude: 37.4502012345, longitude: 126.9526012345 };

// The walk from one Place to another as the app shows it, read from the committed walking table.
async function tableMinutes(from: SeedPlace, to: SeedPlace): Promise<number> {
  const table = await readSeedFile(SEED_DIRECTORY, WALKING_TABLE_FILE, walkingTableSchema);
  const row = (place: SeedPlace): number => table.places.findIndex(({ id }) => id === place.id);
  const seconds = table.placeToPlace[row(from)]?.[row(to)];
  if (seconds === undefined) {
    throw new Error(`The walking table has no walk from ${from.name} to ${to.name}`);
  }
  return Math.ceil(seconds / 60);
}

async function onlyPosition(viewer: TestUser): Promise<unknown> {
  const response = await expectStatus(getPositions(app, viewer), 200);
  const body: unknown = response.body;
  return z.array(z.unknown()).length(1).parse(body)[0];
}

describe('GET /positions, with the Place nearest each position and the walk to it', () => {
  it.each(['exact', 'building'] as const)(
    "gives a Friend at %s the Place nearest them, and the walking table's minutes from the Place nearest the viewer",
    async (level) => {
      const [viewer, friend] = await sharingFriends(app, level);
      await expectStatus(uploadPosition(app, viewer, IN_ENGINEERING), 200);
      await expectStatus(uploadPosition(app, friend, IN_LIBRARY), 200);
      const [library, engineering] = await Promise.all([
        placeNumbered(app, viewer, '62'),
        placeNumbered(app, viewer, '301'),
      ]);

      expect(await onlyPosition(viewer)).toMatchObject({
        level,
        nearPlace: library.name,
        walkMinutes: await tableMinutes(engineering, library),
      });
    },
  );

  it('gives 0 minutes when the viewer and the Friend are nearest the same Place', async () => {
    const [viewer, friend] = await sharingFriends(app);
    await expectStatus(uploadPosition(app, viewer, IN_LIBRARY), 200);
    await expectStatus(uploadPosition(app, friend, IN_LIBRARY), 200);
    const library = await placeNumbered(app, viewer, '62');

    expect(await onlyPosition(viewer)).toMatchObject({ nearPlace: library.name, walkMinutes: 0 });
  });

  it('gives the Place but no minutes while the viewer has no position kept', async () => {
    const [viewer, friend] = await sharingFriends(app);
    await expectStatus(uploadPosition(app, friend, IN_LIBRARY), 200);
    const library = await placeNumbered(app, viewer, '62');

    expect(await onlyPosition(viewer)).toMatchObject({ nearPlace: library.name, walkMinutes: null });
  });
});

describe('GET /positions, by the viewer', () => {
  it('gives each viewer the minutes from the Place nearest them', async () => {
    const [friend, near] = await sharingFriends(app);
    const [, far] = await sharingFriends(app);
    await befriend(app, friend, far);
    await shareAt(app, friend, far, 'exact');
    await Promise.all([
      expectStatus(uploadPosition(app, near, IN_LIBRARY), 200),
      expectStatus(uploadPosition(app, far, IN_ENGINEERING), 200),
    ]);
    await expectStatus(uploadPosition(app, friend, IN_LIBRARY), 200);
    const [library, engineering] = await Promise.all([placeNumbered(app, near, '62'), placeNumbered(app, near, '301')]);

    expect(await onlyPosition(near)).toMatchObject({ userId: friend.id, walkMinutes: 0 });
    expect(await onlyPosition(far)).toMatchObject({
      userId: friend.id,
      walkMinutes: await tableMinutes(engineering, library),
    });
  });
});
