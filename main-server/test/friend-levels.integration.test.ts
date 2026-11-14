/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type FriendLevel } from '../src/generated/prisma/client.js';
import { IN_LIBRARY, IN_NO_PLACE, LEVEL_PAIRS, placeNumbered, type SeedPlace } from './friend-levels.js';
import { befriend, getFriends, signInUser, type TestUser } from './friends.js';
import {
  expectStatus,
  getPositions,
  setFriendLevel,
  setFriendSharing,
  setMasterSwitch,
  sharingFriends,
  uploadPosition,
} from './location-sharing.js';
import { partyOfHolders } from './parties.js';
import { ONBOARDED_PROFILE, withAccessToken } from './sign-in.js';
import { ANY_STRING, refused } from './signals.js';
import { startApp } from './start-app.js';

// The three Friend levels as each User sets their own end, and what a viewer fetches of a Friend at each.

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await app.close();
});

// The one Friend in the User's list as GET /friends gives them.
async function onlyFriendOf(user: TestUser): Promise<unknown> {
  const response = await expectStatus(getFriends(app, user), 200);
  return z.array(z.unknown()).parse(response.body)[0];
}

const friendOf = (friend: TestUser, level: FriendLevel, sharing: boolean, visible: boolean): object => ({
  id: friend.id,
  ...ONBOARDED_PROFILE,
  level,
  sharing,
  visible,
});

describe('A new friendship', () => {
  it('starts at the building on both ends, and GET /friends gives the level, sharing, and visible', async () => {
    const [viewer, subject] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, viewer, subject);
    expect(await onlyFriendOf(viewer)).toEqual(friendOf(subject, 'building', true, false));

    await Promise.all([
      expectStatus(setMasterSwitch(app, viewer, true), 204),
      expectStatus(setMasterSwitch(app, subject, true), 204),
    ]);
    await expectStatus(uploadPosition(app, subject, IN_LIBRARY), 200);

    expect(await onlyFriendOf(viewer)).toEqual(friendOf(subject, 'building', true, true));
    expect(await onlyFriendOf(subject)).toEqual(friendOf(viewer, 'building', true, false));
  });
});

describe('PUT /friends/:userId/level', () => {
  it("sets the User's own end only, and the other sees the lower of the two", async () => {
    const [user, friend] = await sharingFriends(app, 'building');
    await expectStatus(uploadPosition(app, user, IN_LIBRARY), 200);
    await expectStatus(uploadPosition(app, friend, IN_LIBRARY), 200);

    expect((await setFriendLevel(app, user, friend.id, 'timetable')).status).toBe(204);

    expect(await onlyFriendOf(user)).toEqual(friendOf(friend, 'timetable', false, false));
    expect(await onlyFriendOf(friend)).toEqual(friendOf(user, 'building', true, false));
  });

  it.each([
    ['a level that is none', { level: 'college' }],
    ['a field more', { level: 'exact', on: true }],
    ['no level', {}],
  ])('refuses %s', async (_case, body) => {
    const [user, friend] = await sharingFriends(app, 'building');

    const response = await withAccessToken(
      request(app.getHttpServer()).put(`/friends/${friend.id}/level`),
      user.accessToken,
    ).send(body);

    expect(response.status).toBe(400);
    expect(await onlyFriendOf(user)).toMatchObject({ level: 'building' });
  });

  it('refuses a User who is no Friend', async () => {
    const user = await signInUser(app);

    const response = await setFriendLevel(app, user, randomUUID(), 'exact');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'FRIEND_NOT_FOUND'));
  });
});

describe('PUT /friends/:userId/sharing, for an app of before', () => {
  it.each([
    [true, 'exact'],
    [false, 'timetable'],
  ] as const)('with on %s sets the level %s', async (on, level) => {
    const [user, friend] = await sharingFriends(app, 'building');

    await expectStatus(setFriendSharing(app, user, friend.id, on), 204);

    expect(await onlyFriendOf(user)).toMatchObject({ level, sharing: on });
  });
});

// What GET /positions gives at each level of a subject in 중앙도서관: the position, the Place's point, or nothing.
function shownAt(seen: FriendLevel, subject: TestUser, library: SeedPlace, measuredAt: string): object[] {
  const { id, latitude, longitude } = library;
  const shown = {
    exact: [{ userId: subject.id, ...IN_LIBRARY, measuredAt, level: 'exact' }],
    building: [{ userId: subject.id, placeId: id, latitude, longitude, measuredAt, level: 'building' }],
    timetable: [],
  };
  return shown[seen];
}

describe('GET /positions', () => {
  it.each(LEVEL_PAIRS)(
    "gives a viewer at %s whose Friend is at %s what %s shows: the position, the Place's point, or nothing",
    async (viewerEnd, subjectEnd, seen) => {
      const [viewer, subject] = await sharingFriends(app, 'building');
      await expectStatus(setFriendLevel(app, viewer, subject.id, viewerEnd), 204);
      await expectStatus(setFriendLevel(app, subject, viewer.id, subjectEnd), 204);
      const measuredAt = new Date().toISOString();
      await expectStatus(uploadPosition(app, subject, { ...IN_LIBRARY, measuredAt }), 200);
      const library = await placeNumbered(app, viewer, '62');

      const positions = (await getPositions(app, viewer)).body as unknown;

      expect(positions).toEqual(shownAt(seen, subject, library, measuredAt));
      expect(await onlyFriendOf(viewer)).toMatchObject({ visible: seen !== 'timetable' });
    },
  );

  it('gives nothing of a Friend at the building who is in no Place, who is not visible', async () => {
    const [viewer, subject] = await sharingFriends(app, 'building');

    await expectStatus(uploadPosition(app, subject, IN_NO_PLACE), 200);

    expect((await getPositions(app, viewer)).body).toEqual([]);
    expect(await onlyFriendOf(viewer)).toMatchObject({ visible: false });
  });
});

describe('GET /positions, by the Master Switches and a common Party', () => {
  it.each(['viewer', 'subject'] as const)(
    "gives nothing of Friends at the position while the %s's Master Switch is off",
    async (who) => {
      const [viewer, subject] = await sharingFriends(app, 'exact');
      await expectStatus(uploadPosition(app, subject, IN_LIBRARY), 200);

      await expectStatus(setMasterSwitch(app, who === 'viewer' ? viewer : subject, false), 204);

      expect((await getPositions(app, viewer)).body).toEqual([]);
    },
  );

  it.each(['timetable', 'building'] as const)(
    'gives the position of a Friend at %s on both ends who is in a common Party with the viewer',
    async (level) => {
      const [viewer, subject] = await sharingFriends(app, level);
      await partyOfHolders(app, viewer, [subject]);

      await expectStatus(uploadPosition(app, subject, IN_LIBRARY), 200);

      expect((await getPositions(app, viewer)).body).toEqual([
        { userId: subject.id, ...IN_LIBRARY, measuredAt: ANY_STRING, level: 'exact' },
      ]);
    },
  );
});
