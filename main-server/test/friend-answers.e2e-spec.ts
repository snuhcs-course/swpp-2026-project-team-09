import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import {
  answerFriendRequest,
  getFriendRequests,
  getFriends,
  refused,
  requestFriendship,
  signInUser,
} from './friends.js';
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
const NOT_FOUND = refused(404, 'FRIEND_REQUEST_NOT_FOUND');

describe('Accepting a Friend Request', () => {
  it('makes the two Users Friends and removes the request', async () => {
    const sender = await signInUser(app, { name: '홍길동', department: '컴퓨터공학부' });
    const receiver = await signInUser(app, { name: '김철수', department: '경영학과' });
    const requestId = await requestFriendship(app, sender, receiver);

    const response = await answerFriendRequest(app, receiver, requestId, 'accept');

    expect(response.status).toBe(204);
    expect((await getFriends(app, receiver)).body).toEqual([
      { id: sender.id, name: '홍길동', department: '컴퓨터공학부' },
    ]);
    expect((await getFriends(app, sender)).body).toEqual([{ id: receiver.id, name: '김철수', department: '경영학과' }]);
    expect((await getFriendRequests(app, receiver)).body).toEqual(NO_REQUESTS);
    expect((await getFriendRequests(app, sender)).body).toEqual(NO_REQUESTS);
  });

  it('is for the receiver only', async () => {
    const [sender, receiver, other] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const requestId = await requestFriendship(app, sender, receiver);

    const bySender = await answerFriendRequest(app, sender, requestId, 'accept');
    const byOther = await answerFriendRequest(app, other, requestId, 'accept');

    expect([bySender.status, byOther.status]).toEqual([404, 404]);
    expect(bySender.body).toMatchObject(NOT_FOUND);
    expect((await getFriends(app, sender)).body).toEqual([]);
  });

  it('is refused once the request was answered', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    const requestId = await requestFriendship(app, sender, receiver);
    await answerFriendRequest(app, receiver, requestId, 'accept');

    const again = await answerFriendRequest(app, receiver, requestId, 'accept');

    expect(again.status).toBe(404);
    expect(again.body).toMatchObject(NOT_FOUND);
  });

  it('is refused for a request nobody sent', async () => {
    const receiver = await signInUser(app);

    expect((await answerFriendRequest(app, receiver, randomUUID(), 'accept')).body).toMatchObject(NOT_FOUND);
    expect((await answerFriendRequest(app, receiver, 'not-an-id', 'accept')).status).toBe(400);
  });
});

describe('Declining a Friend Request', () => {
  it('removes the request, and the two do not become Friends', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    const requestId = await requestFriendship(app, sender, receiver);

    const response = await answerFriendRequest(app, receiver, requestId, 'decline');

    expect(response.status).toBe(204);
    expect((await getFriendRequests(app, receiver)).body).toEqual(NO_REQUESTS);
    expect((await getFriendRequests(app, sender)).body).toEqual(NO_REQUESTS);
    expect((await getFriends(app, receiver)).body).toEqual([]);
  });

  it('is for the receiver only', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    const requestId = await requestFriendship(app, sender, receiver);

    const response = await answerFriendRequest(app, sender, requestId, 'decline');

    expect(response.body).toMatchObject(NOT_FOUND);
    expect((await getFriendRequests(app, receiver)).body).toMatchObject({ received: [{ id: requestId }] });
  });
});

describe('Cancelling a Friend Request', () => {
  it('removes the request', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    const requestId = await requestFriendship(app, sender, receiver);

    const response = await answerFriendRequest(app, sender, requestId, 'cancel');

    expect(response.status).toBe(204);
    expect((await getFriendRequests(app, receiver)).body).toEqual(NO_REQUESTS);
    expect((await getFriendRequests(app, sender)).body).toEqual(NO_REQUESTS);
  });

  it('is for the sender only', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    const requestId = await requestFriendship(app, sender, receiver);

    const response = await answerFriendRequest(app, receiver, requestId, 'cancel');

    expect(response.body).toMatchObject(NOT_FOUND);
    expect((await getFriendRequests(app, sender)).body).toMatchObject({ sent: [{ id: requestId }] });
  });

  it('is refused once the request was accepted', async () => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    const requestId = await requestFriendship(app, sender, receiver);
    await answerFriendRequest(app, receiver, requestId, 'accept');

    const response = await answerFriendRequest(app, sender, requestId, 'cancel');

    expect(response.body).toMatchObject(NOT_FOUND);
    expect((await getFriends(app, sender)).body).toMatchObject([{ id: receiver.id }]);
  });
});
