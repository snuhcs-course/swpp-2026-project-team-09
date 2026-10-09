/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { postFriendship, signInWithEmailBeforeOnboarding, usersAmong } from './admin-users.js';
import { befriend, getFriendRequests, getFriends, requestFriendship, signInUser, TestUser } from './friends.js';
import { refused, SignalWatcher, signalsWhile } from './signals.js';
import { signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let watcher: SignalWatcher;
let accessToken: string;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
  ({ accessToken } = await signInAsAdministrator(app));
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

const friendsSchema = z.array(z.object({ id: z.string(), sharing: z.boolean() }).loose());

async function friendsOf(user: TestUser): Promise<{ id: string; sharing: boolean }[]> {
  return friendsSchema.parse((await getFriends(app, user)).body).map(({ id, sharing }) => ({ id, sharing }));
}

// The friends-changed signals that name the User, sent while `act` runs.
async function friendsChangedWhile(user: TestUser, act: () => Promise<unknown>): Promise<string[][]> {
  const signals = await signalsWhile(app, watcher, 'friends-changed', act);
  return signals.flatMap(({ userIds }) => (userIds?.includes(user.id) === true ? [userIds.toSorted()] : []));
}

describe('Making two Users Friends', () => {
  it('lets each see the other in their Friends with sharing on, and tells both once', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);

    const signals = await friendsChangedWhile(first, async () => {
      const response = await postFriendship(app, accessToken, first.id, second.id);
      expect(response.status).toBe(204);
    });

    expect(signals).toEqual([[first.id, second.id].toSorted()]);
    expect(await friendsOf(first)).toEqual([{ id: second.id, sharing: true }]);
    expect(await friendsOf(second)).toEqual([{ id: first.id, sharing: true }]);
  });

  it('takes the two Users in either order', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
    const [lower, higher] = [first, second].toSorted((a, b) => (a.id < b.id ? -1 : 1));

    expect((await postFriendship(app, accessToken, higher.id, lower.id)).status).toBe(204);

    expect(await friendsOf(lower)).toEqual([{ id: higher.id, sharing: true }]);
  });

  it('turns a Friend Request waiting between them into the friendship, leaving no request', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    await requestFriendship(app, sender, receiver);

    expect((await postFriendship(app, accessToken, receiver.id, sender.id)).status).toBe(204);

    expect(await friendsOf(sender)).toEqual([{ id: receiver.id, sharing: true }]);
    expect((await getFriendRequests(app, receiver)).body).toEqual({ received: [], sent: [] });
    expect((await getFriendRequests(app, sender)).body).toEqual({ received: [], sent: [] });
  });
});

async function notOnboardedUserId(): Promise<string> {
  const email = await signInWithEmailBeforeOnboarding(app);
  const [user] = await usersAmong(app, accessToken, [email]);
  if (user === undefined) {
    throw new Error('The User before onboarding is not in the list');
  }
  return user.id;
}

describe('Making two Users Friends is refused', () => {
  it('with 400 for an id that is not a UUID', async () => {
    const user = await signInUser(app);

    expect((await postFriendship(app, accessToken, user.id, 'not-a-uuid')).status).toBe(400);
  });

  it.each([
    ['the same User twice', 400, 'SAME_USER', (user: TestUser): Promise<string> => Promise.resolve(user.id)],
    ['a User who does not exist', 404, 'USER_NOT_FOUND', (): Promise<string> => Promise.resolve(randomUUID())],
    ['a User before onboarding', 409, 'USER_NOT_ONBOARDED', notOnboardedUserId],
    [
      'two Friends',
      409,
      'ALREADY_FRIENDS',
      async (user: TestUser): Promise<string> => {
        const friend = await signInUser(app);
        await befriend(app, user, friend);
        return friend.id;
      },
    ],
  ])('for %s with %i %s, storing nothing and telling nobody', async (_case, status, code, otherOf) => {
    const user = await signInUser(app);
    const otherId = await otherOf(user);
    const before = await friendsOf(user);

    const signals = await friendsChangedWhile(user, async () => {
      const response = await postFriendship(app, accessToken, user.id, otherId);
      expect(response.body).toMatchObject(refused(status, code));
    });

    expect(signals).toEqual([]);
    expect(await friendsOf(user)).toEqual(before);
  });

  it('as the same User twice before as an unknown User', async () => {
    const id = randomUUID();

    expect((await postFriendship(app, accessToken, id, id)).body).toMatchObject(refused(400, 'SAME_USER'));
  });

  it('as an unknown User before as a User before onboarding', async () => {
    const response = await postFriendship(app, accessToken, await notOnboardedUserId(), randomUUID());

    expect(response.body).toMatchObject(refused(404, 'USER_NOT_FOUND'));
  });
});
