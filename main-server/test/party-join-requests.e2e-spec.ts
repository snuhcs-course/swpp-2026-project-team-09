/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { befriend, signInUser, TestUser } from './friends.js';
import {
  askToJoin,
  enter,
  getJoinRequests,
  getMyParty,
  getSentJoinRequests,
  joinRequestOf,
  partyOf,
  partyOfHolders,
  withdrawJoinRequest,
} from './parties.js';
import { ANY_STRING, refused, SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
});

afterAll(async () => {
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

describe('A Friend of a member asking to enter an Approval Party', () => {
  it('leaves a request that waits, which the Leader lists with who asked, and tells the Leader', async () => {
    const leader = await signInUser(app);
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });
    await befriend(app, leader, user);
    const partyId = await partyOf(app, leader, { title: '점심 같이', joinPolicy: 'approval' });

    const response = await askToJoin(app, user, partyId);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: ANY_STRING,
      party: {
        id: partyId,
        title: '점심 같이',
        memberCount: 1,
        capacity: 4,
        joinPolicy: 'approval',
        quest: null,
        leader: { id: leader.id, name: ANY_STRING },
        holdsQuest: false,
        friends: [{ id: leader.id, name: ANY_STRING, department: ANY_STRING }],
      },
      sentAt: ANY_STRING,
    });
    expect((await getSentJoinRequests(app, user)).body).toEqual([response.body]);
    expect((await getJoinRequests(app, leader)).body).toEqual([
      { id: ANY_STRING, user: { id: user.id, name: '김철수', department: '경영학과' }, sentAt: ANY_STRING },
    ]);
    expect((await getMyParty(app, user)).status).toBe(404);
    await vi.waitFor(() => {
      expect(partyChangedTo(leader)).toBe(2);
    });
  });
});

describe('Asking to enter is allowed', () => {
  it('to the Friend of a member who is not its Leader', async () => {
    const [leader, member, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, member, user);
    const { partyId } = await partyOfHolders(app, leader, [member], { joinPolicy: 'approval' });

    expect((await askToJoin(app, user, partyId)).status).toBe(201);
  });

  it('to a User in another Party', async () => {
    const [leader, other, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, other, user);
    await enter(app, user, await partyOf(app, other, { joinPolicy: 'open' }));
    await befriend(app, leader, user);
    const partyId = await partyOf(app, leader, { joinPolicy: 'approval' });

    expect((await askToJoin(app, user, partyId)).status).toBe(201);
  });
});

describe('Asking to enter is refused', () => {
  it('for a second request to the same Party', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const [partyId] = await asked(leader, user);

    const response = await askToJoin(app, user, partyId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'JOIN_REQUEST_ALREADY_SENT'));
  });

  it.each(['open', 'closed'])('for an %s Party', async (joinPolicy) => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, leader, user);
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
});

describe('Asking to enter is answered as for an unknown Party', () => {
  it('to a User who is not a Friend of any member', async () => {
    const [leader, member, stranger] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const { partyId } = await partyOfHolders(app, leader, [member], { joinPolicy: 'approval' });

    const response = await askToJoin(app, stranger, partyId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'PARTY_NOT_FOUND'));
    expect((await getJoinRequests(app, leader)).body).toEqual([]);
  });

  it('for a Party that is not running', async () => {
    const user = await signInUser(app);

    const response = await askToJoin(app, user, randomUUID());

    expect(response.status).toBe(404);
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
      expect(partyChangedTo(leader)).toBe(3);
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
