/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import {
  befriend,
  getFriendRequests,
  getFriends,
  requestFriendship,
  sendFriendRequest,
  sendFriendRequestTo,
  signInUser,
} from './friends.js';
import { askToJoin } from './quest-recruiting.js';
import { joinQuest, ownQuest } from './quests.js';
import { ANY_STRING, refused } from './signals.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await app.close();
});

const NO_REQUESTS = { received: [], sent: [] };

describe('Sending a Friend Request', () => {
  it('leaves one waiting request, which both see with the other User', async () => {
    const sender = await signInUser(app, { name: '홍길동', department: '컴퓨터공학부' });
    const receiver = await signInUser(app, { name: '김철수', department: '경영학과' });

    const response = await sendFriendRequest(app, sender, receiver.friendId);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ status: 'waiting' });
    const request = { id: ANY_STRING, sentAt: ANY_STRING };
    expect((await getFriendRequests(app, receiver)).body).toEqual({
      received: [{ ...request, sender: { id: sender.id, name: '홍길동', department: '컴퓨터공학부' } }],
      sent: [],
    });
    expect((await getFriendRequests(app, sender)).body).toEqual({
      received: [],
      sent: [{ ...request, receiver: { id: receiver.id, name: '김철수', department: '경영학과' } }],
    });
  });

  it('takes a Friend ID typed in small letters', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);

    const response = await sendFriendRequest(app, sender, receiver.friendId.toLowerCase());

    expect(response.status).toBe(201);
  });

  it('makes two Users Friends at once when the other already asked, and leaves no request', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
    await requestFriendship(app, first, second);

    const response = await sendFriendRequest(app, second, first.friendId);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ status: 'friends' });
    expect((await getFriendRequests(app, first)).body).toEqual(NO_REQUESTS);
    expect((await getFriendRequests(app, second)).body).toEqual(NO_REQUESTS);
    expect((await getFriends(app, first)).body).toMatchObject([{ id: second.id }]);
  });
});

describe('A Friend Request by user id', () => {
  it('goes to another Holder of a Quest the sender holds', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    await joinQuest(app, member, await ownQuest(app, leader, { joinPolicy: 'open' }));

    const response = await sendFriendRequestTo(app, member, leader.id);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ status: 'waiting' });
    expect((await getFriendRequests(app, leader)).body).toMatchObject({ received: [{ sender: { id: member.id } }] });
  });

  it('makes the two Friends when the other Holder already asked', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    await joinQuest(app, member, await ownQuest(app, leader, { joinPolicy: 'open' }));
    await sendFriendRequestTo(app, leader, member.id);

    const response = await sendFriendRequestTo(app, member, leader.id);

    expect(response.body).toEqual({ status: 'friends' });
  });
});

describe('A Friend Request by user id that cannot be sent', () => {
  it('is refused for a User who holds no Quest with the sender, such as one who only asked to join', async () => {
    const [leader, asking] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'approval' });
    await askToJoin(app, asking, questId);

    const responses = await Promise.all([
      sendFriendRequestTo(app, asking, leader.id),
      sendFriendRequestTo(app, leader, asking.id),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject(refused(403, 'NOT_FELLOW_HOLDER'));
    }
    expect((await getFriendRequests(app, leader)).body).toEqual(NO_REQUESTS);
  });

  it('is refused for a user id nobody holds, as for one who holds no Quest with the sender', async () => {
    const sender = await signInUser(app);
    await ownQuest(app, sender);

    const response = await sendFriendRequestTo(app, sender, '00000000-0000-4000-8000-000000000000');

    expect(response.body).toMatchObject(refused(403, 'NOT_FELLOW_HOLDER'));
  });
});

describe('A Friend Request by user id refused as any Friend Request', () => {
  it('is refused for a Friend, and when a request already waits', async () => {
    const [leader, friend, asked] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
    await Promise.all([joinQuest(app, friend, questId), joinQuest(app, asked, questId)]);
    await befriend(app, leader, friend);
    await sendFriendRequestTo(app, leader, asked.id);

    const [toFriend, again] = await Promise.all([
      sendFriendRequestTo(app, leader, friend.id),
      sendFriendRequestTo(app, leader, asked.id),
    ]);

    expect(toFriend.body).toMatchObject(refused(409, 'ALREADY_FRIENDS'));
    expect(again.body).toMatchObject(refused(409, 'FRIEND_REQUEST_ALREADY_SENT'));
  });

  it("is refused for the sender's own user id", async () => {
    const sender = await signInUser(app);
    await ownQuest(app, sender);

    const response = await sendFriendRequestTo(app, sender, sender.id);

    expect(response.body).toMatchObject(refused(400, 'OWN_USER_ID'));
  });

  it('is refused with both a Friend ID and a user id', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);

    const response = await sendFriendRequest(app, sender, receiver.friendId).send({
      friendId: receiver.friendId,
      userId: receiver.id,
    });

    expect(response.status).toBe(400);
  });
});

describe('The lists of Friend Requests', () => {
  it('show the newest request first', async () => {
    const receiver = await signInUser(app);
    const earlier = await signInUser(app, { name: '먼저', department: '경영학과' });
    const later = await signInUser(app, { name: '나중', department: '경영학과' });
    await sendFriendRequest(app, earlier, receiver.friendId);
    await sendFriendRequest(app, later, receiver.friendId);

    const response = await getFriendRequests(app, receiver);

    expect(response.body).toMatchObject({ received: [{ sender: { name: '나중' } }, { sender: { name: '먼저' } }] });
  });
});

describe('A Friend Request that cannot be sent', () => {
  it("is refused for the sender's own Friend ID", async () => {
    const sender = await signInUser(app);

    const response = await sendFriendRequest(app, sender, sender.friendId);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(refused(400, 'OWN_FRIEND_ID'));
    expect((await getFriendRequests(app, sender)).body).toEqual(NO_REQUESTS);
  });

  it('is refused for a Friend ID nobody holds', async () => {
    const sender = await signInUser(app);

    const response = await sendFriendRequest(app, sender, 'AAAAAAAA');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'FRIEND_ID_NOT_FOUND'));
  });

  it('is refused for a Friend', async () => {
    const [sender, friend] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, friend, sender);

    const response = await sendFriendRequest(app, sender, friend.friendId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_FRIENDS'));
    expect((await getFriendRequests(app, friend)).body).toEqual(NO_REQUESTS);
  });

  it('is refused when a request to that User already waits', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    await requestFriendship(app, sender, receiver);

    const response = await sendFriendRequest(app, sender, receiver.friendId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'FRIEND_REQUEST_ALREADY_SENT'));
    expect((await getFriendRequests(app, receiver)).body).toMatchObject({ received: [expect.anything()] });
  });

  it('is refused without a Friend ID', async () => {
    const sender = await signInUser(app);

    const response = await sendFriendRequest(app, sender, '');

    expect(response.status).toBe(400);
  });
});
