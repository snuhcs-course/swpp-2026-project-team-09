/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import {
  answerFriendRequest,
  befriend,
  endFriendship,
  getFriends,
  KOREA_TIME,
  NEW_FRIENDSHIP,
  requestFriendship,
  sendFriendRequest,
  signInUser,
  type TestUser,
} from './friends.js';
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

const ONE_FRIEND = z.tuple([z.object({ id: z.string(), friendId: z.string(), friendsSince: z.string() })]);

async function onlyFriendOf(user: TestUser): Promise<z.infer<typeof ONE_FRIEND>[0]> {
  const [friend] = ONE_FRIEND.parse((await getFriends(app, user)).body);
  return friend;
}

describe('The list of Friends', () => {
  it('names each Friend with the name, the department and the Friend ID, in the order of the names', async () => {
    const user = await signInUser(app);
    const gildong = await signInUser(app, { name: '홍길동', department: '컴퓨터공학부' });
    const cheolsu = await signInUser(app, { name: '김철수', department: '경영학과' });
    await befriend(app, user, gildong);
    await befriend(app, cheolsu, user);

    const response = await getFriends(app, user);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: cheolsu.id, name: '김철수', department: '경영학과', friendId: cheolsu.friendId, ...NEW_FRIENDSHIP },
      { id: gildong.id, name: '홍길동', department: '컴퓨터공학부', friendId: gildong.friendId, ...NEW_FRIENDSHIP },
    ]);
  });

  it('gives since when the request was accepted, the same at both ends', async () => {
    const [user, friend] = await Promise.all([signInUser(app), signInUser(app)]);
    const requestId = await requestFriendship(app, user, friend);
    // The time is given to the second.
    const before = Math.floor(Date.now() / 1000) * 1000;
    expect((await answerFriendRequest(app, friend, requestId, 'accept')).status).toBe(204);
    const after = Date.now();

    const [toUser, toFriend] = await Promise.all([onlyFriendOf(user), onlyFriendOf(friend)]);

    expect(toUser).toEqual({ id: friend.id, friendId: friend.friendId, friendsSince: toFriend.friendsSince });
    expect(toFriend).toMatchObject({ id: user.id, friendId: user.friendId });
    expect(toUser.friendsSince).toMatch(KOREA_TIME);
    expect(Date.parse(toUser.friendsSince)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(toUser.friendsSince)).toBeLessThanOrEqual(after);
  });

  it('leaves out the Users a Friend Request waits for', async () => {
    const [user, asked] = await Promise.all([signInUser(app), signInUser(app)]);
    await sendFriendRequest(app, user, asked.friendId);

    expect((await getFriends(app, user)).body).toEqual([]);
    expect((await getFriends(app, asked)).body).toEqual([]);
  });
});

describe('Ending a friendship', () => {
  it('removes it for both', async () => {
    const [user, friend] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, user, friend);

    const response = await endFriendship(app, user, friend.id);

    expect(response.status).toBe(204);
    expect((await getFriends(app, user)).body).toEqual([]);
    expect((await getFriends(app, friend)).body).toEqual([]);
  });

  it('lets the two send a Friend Request again', async () => {
    const [user, friend] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, user, friend);
    await endFriendship(app, friend, user.id);

    expect((await sendFriendRequest(app, user, friend.friendId)).status).toBe(201);
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

    const response = await endFriendship(app, user, ids[other]);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'FRIEND_NOT_FOUND'));
  });
});
