// AI-generated with Claude Fable 5.1, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #38
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { connect } from './containers.js';
import {
  answerFriendRequest,
  getFriendRequests,
  getFriends,
  requestFriendship,
  sendFriendRequest,
  signInUser,
  TestUser,
} from './friends.js';
import { overlapOnLock } from './overlap.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
const prisma = connect(settings.DATABASE_URL);

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const NO_REQUESTS = { received: [], sent: [] };

function inIdOrder(first: TestUser, second: TestUser): [TestUser, TestUser] {
  return first.id < second.id ? [first, second] : [second, first];
}

describe('Two Friend Requests that cross', () => {
  it('make the two Users Friends once and leave no request', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
    const [lower] = inIdOrder(first, second);

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM users WHERE id = ${lower.id}::uuid FOR UPDATE`,
      () => sendFriendRequest(app, first, second.friendId),
      () => sendFriendRequest(app, second, first.friendId),
    );

    expect(answers.map(({ status }) => status)).toEqual([201, 201]);
    expect(answers.map(({ body }: { body: unknown }) => body)).toEqual([{ status: 'waiting' }, { status: 'friends' }]);
    expect((await getFriends(app, first)).body).toMatchObject([{ id: second.id }]);
    expect((await getFriendRequests(app, first)).body).toEqual(NO_REQUESTS);
    expect((await getFriendRequests(app, second)).body).toEqual(NO_REQUESTS);
  });
});

describe('Two answers to one Friend Request at the same moment', () => {
  it.each([
    ['an accept before a cancel', 'accept', 'cancel', 1],
    ['a cancel before an accept', 'cancel', 'accept', 0],
  ] as const)('leave one friendship or none: %s', async (_case, firstAnswer, secondAnswer, friendships) => {
    const [sender, receiver] = await Promise.all([signInUser(app), signInUser(app)]);
    const requestId = await requestFriendship(app, sender, receiver);
    const answerer = { accept: receiver, cancel: sender };

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM friendships WHERE id = ${requestId}::uuid FOR UPDATE`,
      () => answerFriendRequest(app, answerer[firstAnswer], requestId, firstAnswer),
      () => answerFriendRequest(app, answerer[secondAnswer], requestId, secondAnswer),
    );

    expect(answers.map(({ status }) => status)).toEqual([204, 404]);
    expect((await getFriends(app, sender)).body).toHaveLength(friendships);
    expect((await getFriendRequests(app, sender)).body).toEqual(NO_REQUESTS);
  });
});

describe('The database', () => {
  it('holds one Friend Request or friendship between two Users, whoever sent it', async () => {
    const [first, second] = await Promise.all([signInUser(app), signInUser(app)]);
    const [lower, higher] = inIdOrder(first, second);
    await requestFriendship(app, lower, higher);

    await expect(
      prisma.friendship.create({ data: { userAId: lower.id, userBId: higher.id, senderId: higher.id } }),
    ).rejects.toMatchObject({ code: 'P2002' });
    await expect(
      prisma.friendship.create({ data: { userAId: higher.id, userBId: lower.id, senderId: higher.id } }),
    ).rejects.toThrow('friendships_user_order_check');
  });
});
