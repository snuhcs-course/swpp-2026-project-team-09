import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import {
  answerJoinRequest,
  askToJoin,
  changeParty,
  enter,
  getJoinRequests,
  getMyParty,
  getSentJoinRequests,
  joinRequestOf,
  partyOf,
  withdrawJoinRequest,
} from './parties.js';
import { connectToDatabase, getQuests, questFor, storeEvent } from './quests.js';
import { ANY_STRING, refused, SignalWatcher } from './signals.js';
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

function signalsTo(user: TestUser): string[] {
  return watcher.for(user).map(({ name }) => name);
}

// An Approval Party of the Leader, with a request to join from the User.
async function asked(leader: TestUser, user: TestUser, body: object = {}): Promise<[string, string]> {
  const partyId = await partyOf(app, leader, { joinPolicy: 'approval', ...body });
  return [partyId, await joinRequestOf(app, user, partyId)];
}

describe('Asking to join an Approval Party', () => {
  it('leaves a request that waits, which the Leader lists with who asked, and tells the Leader', async () => {
    const leader = await signInUser(app);
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });
    const partyId = await partyOf(app, leader, { title: '점심 같이', joinPolicy: 'approval' });

    const response = await askToJoin(app, user, partyId);

    expect(response.status).toBe(201);
    const sent = {
      id: ANY_STRING,
      party: { id: partyId, title: '점심 같이', capacity: 4, joinPolicy: 'approval', memberCount: 1, mark: null },
      sentAt: ANY_STRING,
    };
    expect(response.body).toEqual(sent);
    expect((await getSentJoinRequests(app, user)).body).toEqual([sent]);
    expect((await getJoinRequests(app, leader)).body).toEqual([
      { id: ANY_STRING, user: { id: user.id, name: '김철수', department: '경영학과' }, sentAt: ANY_STRING },
    ]);
    expect((await getMyParty(app, user)).status).toBe(404);
    await vi.waitFor(() => {
      expect(signalsTo(leader)).toEqual(['party-changed', 'party-changed']);
    });
  });

  it('is allowed to a User in another Party', async () => {
    const [leader, other, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await enter(app, user, await partyOf(app, other));
    const partyId = await partyOf(app, leader, { joinPolicy: 'approval' });

    expect((await askToJoin(app, user, partyId)).status).toBe(201);
  });
});

describe('Asking to join is refused', () => {
  it('for a second request to the same Party', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const [partyId] = await asked(leader, user);

    const response = await askToJoin(app, user, partyId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'JOIN_REQUEST_ALREADY_SENT'));
  });

  it.each(['open', 'closed'])('for an %s Party', async (joinPolicy) => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const partyId = await partyOf(app, leader, { joinPolicy });

    const response = await askToJoin(app, user, partyId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PARTY_NOT_APPROVAL'));
  });

  it('to a member of the Party', async () => {
    const leader = await signInUser(app);
    const partyId = await partyOf(app, leader, { joinPolicy: 'approval' });

    const response = await askToJoin(app, leader, partyId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_MEMBER'));
  });

  it('for a Party that is not running', async () => {
    const user = await signInUser(app);

    const response = await askToJoin(app, user, randomUUID());

    expect(response.body).toMatchObject(refused(404, 'PARTY_NOT_FOUND'));
  });
});

describe('Withdrawing a request', () => {
  it('ends it, and tells the Leader', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const [, requestId] = await asked(leader, user);

    const response = await withdrawJoinRequest(app, user, requestId);

    expect(response.status).toBe(204);
    expect((await getSentJoinRequests(app, user)).body).toEqual([]);
    expect((await getJoinRequests(app, leader)).body).toEqual([]);
    await vi.waitFor(() => {
      expect(signalsTo(leader)).toEqual(['party-changed', 'party-changed', 'party-changed']);
    });
  });

  it('is refused to another User', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const [, requestId] = await asked(leader, user);

    const response = await withdrawJoinRequest(app, leader, requestId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'JOIN_REQUEST_NOT_FOUND'));
  });
});

describe('The Leader accepting a request', () => {
  it('adds the User, ends the request, and tells every member', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
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
      expect(signalsTo(user)).toEqual(['party-changed']);
      expect(signalsTo(leader)).toEqual(['party-changed', 'party-changed', 'party-changed']);
    });
  });

  it('into a marked Party makes the User a Holder of its Quest', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId } = await questFor(app, leader, (await storeEvent(prisma)).id);
    const [, requestId] = await asked(leader, user, { questId });

    await answerJoinRequest(app, leader, requestId, 'accept');

    expect((await getQuests(app, user)).body).toMatchObject([{ id: questId, holders: [{}, {}] }]);
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

  it.each(['open', 'closed'])('when the Leader made the Party %s since', async (joinPolicy) => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const [, requestId] = await asked(leader, user);
    await changeParty(app, leader, { joinPolicy });

    const response = await answerJoinRequest(app, leader, requestId, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PARTY_NOT_APPROVAL'));
    expect((await answerJoinRequest(app, leader, requestId, 'decline')).status).toBe(204);
  });

  it('when the User is in a Party by then', async () => {
    const [leader, other, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await enter(app, user, await partyOf(app, other));
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
      expect(signalsTo(user)).toEqual(['party-changed']);
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
