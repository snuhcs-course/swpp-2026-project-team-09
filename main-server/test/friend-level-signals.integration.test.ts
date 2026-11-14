/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { type FriendLevel } from '../src/generated/prisma/client.js';
import { coordinatesIn, IN_LIBRARY, IN_NO_PLACE, placeNumbered, type SeedPlace } from './friend-levels.js';
import { befriend, signInUser, type TestUser } from './friends.js';
import {
  expectStatus,
  KEPT_POSITION,
  setFriendLevel,
  setMasterSwitch,
  sharingFriends,
  uploadPosition,
} from './location-sharing.js';
import { leaveParty, partyOfHolders } from './parties.js';
import { ANY_STRING, type SignalEvent, SignalWatcher, signalsWhile } from './signals.js';
import { startApp } from './start-app.js';

// What the `position` and `position-removed` signals tell a viewer of a Friend at each level, on an upload and on a
// change. Signals are read by the Users of each test only, since other files share the Redis.

const settings = inject('settings');
let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(settings), SignalWatcher.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

const aboutSchema = z.object({ userId: z.string() });

// The signals of the subject's position sent while `act` ran.
async function aboutWhile(subject: TestUser, act: () => Promise<unknown>): Promise<SignalEvent[]> {
  const sent = await signalsWhile(app, watcher, ['position', 'position-removed'], act);
  return sent.filter(({ payload }) => aboutSchema.safeParse(payload).data?.userId === subject.id);
}

// Those of the signals that reached the viewer, each by its name and what it carried.
const reaching = (viewer: TestUser, signals: SignalEvent[]): { name: string; payload: unknown }[] =>
  signals
    .filter(({ userIds }) => userIds?.includes(viewer.id) === true)
    .map(({ name, payload }) => ({ name, payload }));

const placed = (subject: TestUser, place: SeedPlace, measuredAt: unknown = ANY_STRING): object => ({
  name: 'position',
  payload: {
    userId: subject.id,
    placeId: place.id,
    latitude: place.latitude,
    longitude: place.longitude,
    measuredAt,
    level: 'building',
  },
});

const removed = (subject: TestUser): object => ({ name: 'position-removed', payload: { userId: subject.id } });

const secondsAgo = (seconds: number): string => new Date(Date.now() - seconds * 1000).toISOString();

describe('An upload', () => {
  it('sends an exact viewer each position, and a building viewer the Place only when it changes', async () => {
    const [subject, exactViewer] = await sharingFriends(app, 'exact');
    const buildingViewer = await signInUser(app);
    await befriend(app, subject, buildingViewer);
    await expectStatus(setMasterSwitch(app, buildingViewer, true), 204);
    const [library, doosan] = await Promise.all(['62', '8'].map((number) => placeNumbered(app, subject, number)));
    const uploads = [IN_LIBRARY, IN_LIBRARY, KEPT_POSITION, IN_NO_PLACE].map(({ latitude, longitude }, index) => ({
      latitude,
      longitude,
      measuredAt: secondsAgo(10 - index),
    }));
    const sent = await aboutWhile(subject, async () => {
      for (const upload of uploads) {
        // oxlint-disable-next-line no-await-in-loop -- in the order a phone walks
        await expectStatus(uploadPosition(app, subject, upload), 200);
      }
    });

    const [toBuilding, toExact] = [reaching(buildingViewer, sent), reaching(exactViewer, sent)];
    expect(toBuilding).toEqual([
      placed(subject, library, uploads[0]?.measuredAt),
      placed(subject, doosan, uploads[2]?.measuredAt),
      removed(subject),
    ]);
    expect(coordinatesIn(toBuilding, IN_LIBRARY, KEPT_POSITION, IN_NO_PLACE)).toEqual([]);
    expect(toExact).toEqual(
      uploads.map((upload) => ({ name: 'position', payload: { userId: subject.id, ...upload, level: 'exact' } })),
    );
  });
});

// The subject's level at the start and after the change, and what the viewer, whose own end is exact, is told.
const CHANGES: [FriendLevel, FriendLevel, 'the Place' | 'the removal' | 'nothing'][] = [
  ['exact', 'building', 'the Place'],
  ['exact', 'timetable', 'the removal'],
  ['building', 'timetable', 'the removal'],
  ['timetable', 'building', 'the Place'],
  ['building', 'exact', 'nothing'],
  ['timetable', 'exact', 'nothing'],
];

describe('A change of level', () => {
  it.each(CHANGES)('from %s to %s tells the other User %s, at once', async (from, to, told) => {
    const [viewer, subject] = await sharingFriends(app, 'exact');
    await expectStatus(setFriendLevel(app, subject, viewer.id, from), 204);
    await expectStatus(uploadPosition(app, subject, IN_LIBRARY), 200);
    const library = await placeNumbered(app, viewer, '62');

    const sent = await aboutWhile(subject, () => expectStatus(setFriendLevel(app, subject, viewer.id, to), 204));

    const expected = { 'the Place': [placed(subject, library)], 'the removal': [removed(subject)], nothing: [] };
    expect(reaching(viewer, sent)).toEqual(expected[told]);
  });

  it('up to exact sends the position with the next upload', async () => {
    const [viewer, subject] = await sharingFriends(app, 'building');
    await expectStatus(uploadPosition(app, subject, IN_LIBRARY), 200);
    await Promise.all([
      expectStatus(setFriendLevel(app, subject, viewer.id, 'exact'), 204),
      expectStatus(setFriendLevel(app, viewer, subject.id, 'exact'), 204),
    ]);
    const measuredAt = new Date().toISOString();

    const sent = await aboutWhile(subject, () =>
      expectStatus(uploadPosition(app, subject, { ...IN_LIBRARY, measuredAt }), 200),
    );

    expect(reaching(viewer, sent)).toEqual([
      { name: 'position', payload: { userId: subject.id, ...IN_LIBRARY, measuredAt, level: 'exact' } },
    ]);
  });
});

describe('Leaving a common Party', () => {
  it('gives Friends at the building the Place in place of the position', async () => {
    const [viewer, subject] = await sharingFriends(app, 'building');
    await partyOfHolders(app, viewer, [subject]);
    await expectStatus(uploadPosition(app, subject, IN_LIBRARY), 200);
    const library = await placeNumbered(app, viewer, '62');

    const sent = await aboutWhile(subject, () => expectStatus(leaveParty(app, subject), 204));

    expect(reaching(viewer, sent)).toEqual([placed(subject, library)]);
  });
});
