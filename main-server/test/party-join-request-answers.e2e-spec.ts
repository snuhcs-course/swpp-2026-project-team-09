import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser, TestUser } from './friends.js';
import {
  answerJoinRequest,
  changeParty,
  enter,
  getJoinRequests,
  getMyParty,
  getSentJoinRequests,
  joinRequestOf,
  partyOf,
} from './parties.js';
import { connectToDatabase, getQuest, getQuests, ownQuest } from './quests.js';
import { refused, SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await watcher.stop();
  await app.close();
});

function partyChangedTo(user: TestUser): number {
  return watcher.for(user).filter(({ name }) => name === 'party-changed').length;
}

// An Approval Party of the Leader, with a request to enter from a Friend of the Leader.
async function asked(leader: TestUser, user: TestUser, body: object = {}): Promise<[string, string]> {
  await befriend(app, leader, user);
  const partyId = await partyOf(app, leader, { joinPolicy: 'approval', ...body });
  return [partyId, await joinRequestOf(app, user, partyId)];
}

describe('The Leader accepting a request', () => {
  it('adds the User, ends the request, and tells the members and the Friends of the members', async () => {
    const [leader, user, userFriend] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, user, userFriend);
    const [partyId, requestId] = await asked(leader, user);

    const response = await answerJoinRequest(app, leader, requestId, 'accept');

    expect(response.status).toBe(204);
    expect((await getMyParty(app, user)).body).toMatchObject({
      id: partyId,
      members: [{ id: leader.id }, { id: user.id }],
    });
    expect((await getJoinRequests(app, leader)).body).toEqual([]);
    expect((await getSentJoinRequests(app, user)).body).toEqual([]);
    await vi.waitFor(() => {
      expect(partyChangedTo(leader)).toBe(3);
      expect(partyChangedTo(user)).toBe(2);
      expect(partyChangedTo(userFriend)).toBe(1);
    });
  });

  it('into a Party with a Quest leaves the Quests as they are', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader);
    const [, requestId] = await asked(leader, user, { questId });

    expect((await answerJoinRequest(app, leader, requestId, 'accept')).status).toBe(204);

    expect((await getQuests(app, user)).body).toEqual([]);
    expect((await getQuest(app, leader, questId)).body).toMatchObject({ holders: [{ id: leader.id }] });
    expect(watcher.for(user).map(({ name }) => name)).not.toContain('quests-changed');
  });

  it.each(['open', 'closed'])('admits the User when the Leader made the Party %s since', async (joinPolicy) => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const [partyId, requestId] = await asked(leader, user);
    await changeParty(app, leader, { joinPolicy });

    expect((await getJoinRequests(app, leader)).body).toHaveLength(1);
    expect((await answerJoinRequest(app, leader, requestId, 'accept')).status).toBe(204);
    expect((await getMyParty(app, user)).body).toMatchObject({ id: partyId });
  });
});

describe('The Leader accepting a request is refused', () => {
  it('when the Party is full', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const [, requestId] = await asked(leader, user, { capacity: 1 });

    const response = await answerJoinRequest(app, leader, requestId, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PARTY_FULL'));
    expect((await getJoinRequests(app, leader)).body).toHaveLength(1);
  });

  it('when the User is in a Party by then', async () => {
    const [leader, other, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, other, user);
    await enter(app, user, await partyOf(app, other, { joinPolicy: 'open' }));
    const [, requestId] = await asked(leader, user);

    const response = await answerJoinRequest(app, leader, requestId, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_IN_PARTY'));
  });
});

describe('The Leader declining a request', () => {
  it('ends it, and tells the User who asked', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const [, requestId] = await asked(leader, user);

    const response = await answerJoinRequest(app, leader, requestId, 'decline');

    expect(response.status).toBe(204);
    expect((await getSentJoinRequests(app, user)).body).toEqual([]);
    expect((await getMyParty(app, user)).status).toBe(404);
    await vi.waitFor(() => {
      expect(partyChangedTo(user)).toBe(2);
    });
  });
});

describe('Answering a request is refused', () => {
  it.each(['accept', 'decline'] as const)('to %s one answered already', async (answer) => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const [, requestId] = await asked(leader, user);
    await answerJoinRequest(app, leader, requestId, 'decline');

    const response = await answerJoinRequest(app, leader, requestId, answer);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'JOIN_REQUEST_NOT_FOUND'));
  });

  it('to the Leader of another Party', async () => {
    const [leader, other, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const [, requestId] = await asked(leader, user);
    await partyOf(app, other);

    const response = await answerJoinRequest(app, other, requestId, 'accept');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'JOIN_REQUEST_NOT_FOUND'));
  });
});

describe('The Leader’s part of requests', () => {
  it('is refused to another member: listing, accepting and declining', async () => {
    const [leader, member, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const [partyId, requestId] = await asked(leader, user);
    await prisma.partyMember.create({ data: { partyId, userId: member.id } });

    const responses = await Promise.all([
      getJoinRequests(app, member),
      answerJoinRequest(app, member, requestId, 'accept'),
      answerJoinRequest(app, member, requestId, 'decline'),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject(refused(403, 'NOT_PARTY_LEADER'));
    }
    expect((await getJoinRequests(app, leader)).body).toHaveLength(1);
  });

  it('is refused to a User in no Party', async () => {
    const user = await signInUser(app);

    const response = await getJoinRequests(app, user);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
  });
});
