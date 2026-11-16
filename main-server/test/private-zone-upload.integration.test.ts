/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { REDIS } from '../src/common/redis.module.js';
import { type Position } from '../src/common/geometry.js';
import { type FriendViewService } from '../src/friends/friend-view.service.js';
import { befriend, signInUser, type TestUser } from './friends.js';
import { expectStatus, getPositions, ON_CAMPUS, shareAt, sharingFriends, uploadPosition } from './location-sharing.js';
import { addZone, deleteZone, placePoint } from './private-zones.js';
import { ANY_STRING, SignalWatcher, signalsWhile } from './signals.js';
import { startApp } from './start-app.js';
import { offset, squareRound } from './zone-shapes.js';

// An upload inside one of the User's Private Zones, round the seed's 301동: what is kept, what the viewers are told
// and what they see after.

const settings = inject('settings');
let app: INestApplication<Server>;
let watcher: SignalWatcher;
let view: FriendViewService;
let place301: Position;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(settings), SignalWatcher.start()]);
  // Imported after startApp, so that it is the class the server registered.
  const { FriendViewService } = await import('../src/friends/friend-view.service.js');
  view = app.get(FriendViewService);
  place301 = await placePoint(app, await signInUser(app), '301');
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

const SLOW = { timeout: 20_000 };

async function zoneRound301(user: TestUser): Promise<string> {
  const response = await expectStatus(addZone(app, user, { outline: squareRound(place301, 100) }), 201);
  return z.object({ id: z.string() }).parse(response.body).id;
}

// A subject with a Friend at exact and one at the building, who see them at 중앙도서관 본관 (62동).
async function seenAtTheLibrary(): Promise<[TestUser, TestUser, TestUser]> {
  const [subject, exact] = await sharingFriends(app, 'exact');
  const building = await signInUser(app);
  await befriend(app, subject, building);
  await shareAt(app, subject, building, 'building');
  await expectStatus(uploadPosition(app, subject, ON_CAMPUS), 200);
  return [subject, exact, building];
}

// The viewers `position-removed` named for the subject while `act` ran.
async function removedWhile(subject: TestUser, act: () => Promise<unknown>): Promise<string[]> {
  const signals = await signalsWhile(app, watcher, 'position-removed', act);
  return signals
    .filter(({ payload }) => z.object({ userId: z.string() }).safeParse(payload).data?.userId === subject.id)
    .flatMap(({ userIds }) => userIds ?? []);
}

const levelIn = async (viewer: TestUser, subject: TestUser): Promise<string | undefined> =>
  (await view.list(viewer.id)).find(({ id }) => id === subject.id)?.level;

describe('An upload inside a Private Zone', () => {
  it('is not kept, says privateZone, and leaves each viewer without a position', SLOW, async () => {
    const [subject, exact, building] = await seenAtTheLibrary();
    await zoneRound301(subject);
    expect((await getPositions(app, building)).body).toEqual([expect.objectContaining({ level: 'building' })]);
    let answer: unknown;

    const removed = await removedWhile(subject, async () => {
      answer = (await expectStatus(uploadPosition(app, subject, place301), 200)).body;
    });

    expect(answer).toEqual({ offCampus: false, privateZone: true });
    expect(removed.toSorted()).toEqual([exact.id, building.id].toSorted());
    expect((await getPositions(app, exact)).body).toEqual([]);
    expect((await getPositions(app, building)).body).toEqual([]);
    expect(await app.get<Redis>(REDIS).exists(`position:${subject.id}`)).toBe(0);
    expect(await levelIn(exact, subject)).toBe('timetable');
    expect(await levelIn(building, subject)).toBe('timetable');
  });

  it('within 10 m outside its outline is not kept either', async () => {
    const [subject] = await sharingFriends(app);
    await zoneRound301(subject);

    const response = await uploadPosition(app, subject, offset(place301, -58, 0));

    expect(response.body).toEqual({ offCampus: false, privateZone: true });
  });
});

describe('An upload outside every Private Zone', () => {
  it('is kept as before, with privateZone false', async () => {
    const [subject, viewer] = await sharingFriends(app);
    await zoneRound301(subject);
    const measuredAt = new Date().toISOString();

    const response = await uploadPosition(app, subject, { ...ON_CAMPUS, measuredAt });

    expect(response.body).toEqual({ offCampus: false, privateZone: false });
    expect((await getPositions(app, viewer)).body).toEqual([
      { userId: subject.id, ...ON_CAMPUS, measuredAt, level: 'exact' },
    ]);
  });
});

describe('A new Private Zone', () => {
  it(
    'round the stored position clears it at once, and once deleted the next upload shows the User again',
    SLOW,
    async () => {
      const [subject, exact, building] = await seenAtTheLibrary();
      await expectStatus(uploadPosition(app, subject, place301), 200);

      let id = '';
      const removed = await removedWhile(subject, async () => {
        id = await zoneRound301(subject);
      });

      expect(removed.toSorted()).toEqual([exact.id, building.id].toSorted());
      expect((await getPositions(app, exact)).body).toEqual([]);
      await expectStatus(deleteZone(app, subject, id), 204);
      expect((await getPositions(app, exact)).body).toEqual([]);
      expect((await uploadPosition(app, subject, place301)).body).toEqual({ offCampus: false, privateZone: false });
      expect((await getPositions(app, exact)).body).toEqual([
        { userId: subject.id, ...place301, measuredAt: ANY_STRING, level: 'exact' },
      ]);
    },
  );

  it('that does not hold the stored position leaves it', async () => {
    const [subject, viewer] = await sharingFriends(app);
    await expectStatus(uploadPosition(app, subject, ON_CAMPUS), 200);

    await zoneRound301(subject);

    expect((await getPositions(app, viewer)).body).toEqual([expect.objectContaining({ userId: subject.id })]);
  });
});
