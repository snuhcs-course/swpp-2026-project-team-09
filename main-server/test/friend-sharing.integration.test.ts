/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { REDIS } from '../src/common/redis.module.js';
import { befriend, getFriends, sendFriendRequest, signInUser, TestUser } from './friends.js';
import {
  expectStatus,
  getPositions,
  OFF_CAMPUS,
  setFriendSharing,
  setMasterSwitch,
  sharingFriends,
  uploadPosition,
} from './location-sharing.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await app.close();
});

// Each Friend in the list as the User's own switch and whether the User can see them now.
async function sharingIn(user: TestUser): Promise<Record<string, unknown>> {
  const friends = z
    .array(z.object({ id: z.string(), sharing: z.boolean(), visible: z.boolean() }))
    .parse((await getFriends(app, user)).body);
  return Object.fromEntries(friends.map(({ id, sharing, visible }) => [id, { sharing, visible }]));
}

describe("A friendship's switch", () => {
  it('starts on, and the list of Friends says whether the User can see each Friend now', async () => {
    const [user, friend] = await sharingFriends(app);
    await uploadPosition(app, friend);

    expect(await sharingIn(user)).toEqual({ [friend.id]: { sharing: true, visible: true } });
    expect(await sharingIn(friend)).toEqual({ [user.id]: { sharing: true, visible: false } });
  });

  it('is changed by a User at their own end only, and hides the two from each other', async () => {
    const [user, friend] = await sharingFriends(app);
    await Promise.all([uploadPosition(app, user), uploadPosition(app, friend)]);

    expect((await setFriendSharing(app, user, friend.id, false)).status).toBe(204);

    expect(await sharingIn(user)).toEqual({ [friend.id]: { sharing: false, visible: false } });
    expect(await sharingIn(friend)).toEqual({ [user.id]: { sharing: true, visible: false } });
    expect((await getPositions(app, user)).body).toEqual([]);
    expect((await getPositions(app, friend)).body).toEqual([]);
  });

  it('turned on again lets the two see each other again', async () => {
    const [user, friend] = await sharingFriends(app);
    await setFriendSharing(app, user, friend.id, false);
    await setFriendSharing(app, user, friend.id, true);

    await uploadPosition(app, friend);

    expect(await sharingIn(user)).toEqual({ [friend.id]: { sharing: true, visible: true } });
  });

  it.each([
    ['a User asked to be a Friend', 'asked'],
    ['a User never asked', 'stranger'],
    ['the User themselves', 'user'],
    ['an id nobody has', 'nobody'],
  ] as const)('is refused for %s', async (_case, other) => {
    const [user, asked, stranger] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await sendFriendRequest(app, user, asked.friendId);
    const ids = { asked: asked.id, stranger: stranger.id, user: user.id, nobody: randomUUID() };

    const response = await setFriendSharing(app, user, ids[other], false);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'FRIEND_NOT_FOUND'));
  });
});

describe('A Friend who cannot be seen', () => {
  it('looks the same off campus, with sharing off and with an expired position', async () => {
    const [viewer, offCampus] = await sharingFriends(app);
    const [sharingOff, expired] = await Promise.all([signInUser(app), signInUser(app)]);
    await Promise.all(
      [sharingOff, expired].map(async (friend) => {
        await befriend(app, viewer, friend);
        await expectStatus(setMasterSwitch(app, friend, true), 204);
        await expectStatus(uploadPosition(app, friend), 200);
      }),
    );
    await uploadPosition(app, offCampus);
    await uploadPosition(app, offCampus, OFF_CAMPUS);
    await setMasterSwitch(app, sharingOff, false);
    // What Redis does when the position's 10 minutes are over.
    await app.get<Redis>(REDIS).del(`position:${expired.id}`);

    expect((await getPositions(app, viewer)).body).toEqual([]);
    const seen = { sharing: true, visible: false };
    expect(await sharingIn(viewer)).toEqual({ [offCampus.id]: seen, [sharingOff.id]: seen, [expired.id]: seen });
  });
});
