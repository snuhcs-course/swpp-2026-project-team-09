import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { answerInvitation, enter, getInvitations, getMyParty, invitationOf, invite, partyOf } from './parties.js';
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

// A Leader and a Friend of theirs.
async function friends(): Promise<[TestUser, TestUser]> {
  const [leader, friend] = await Promise.all([signInUser(app), signInUser(app)]);
  await befriend(app, leader, friend);
  return [leader, friend];
}

// A Party of the Leader, with an invitation of the Friend into it.
async function invited(leader: TestUser, friend: TestUser, body: object = {}): Promise<[string, string]> {
  const partyId = await partyOf(app, leader, { joinPolicy: 'closed', ...body });
  return [partyId, await invitationOf(app, leader, friend)];
}

describe('The Leader inviting a Friend', () => {
  it('leaves an invitation the Friend lists with the Party and its Leader, and tells the Friend', async () => {
    const leader = await signInUser(app, { name: '홍길동', department: '컴퓨터공학부' });
    const friend = await signInUser(app);
    await befriend(app, leader, friend);
    const partyId = await partyOf(app, leader, { title: '저녁 같이', joinPolicy: 'closed' });

    const response = await invite(app, leader, friend.id);

    expect(response.status).toBe(204);
    expect((await getInvitations(app, friend)).body).toEqual([
      {
        id: ANY_STRING,
        party: { id: partyId, title: '저녁 같이', capacity: 4, joinPolicy: 'closed', memberCount: 1, mark: null },
        leader: { id: leader.id, name: '홍길동', department: '컴퓨터공학부' },
        sentAt: ANY_STRING,
      },
    ]);
    await vi.waitFor(() => {
      expect(signalsTo(friend)).toContain('party-changed');
    });
  });

  it('is allowed for a Friend in another Party', async () => {
    const [leader, friend] = await friends();
    await partyOf(app, friend);
    await partyOf(app, leader);

    expect((await invite(app, leader, friend.id)).status).toBe(204);
  });
});

describe('Inviting is refused', () => {
  it('for a User who is not the Leader’s Friend', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    await partyOf(app, leader);

    const response = await invite(app, leader, user.id);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'FRIEND_NOT_FOUND'));
    expect((await getInvitations(app, user)).body).toEqual([]);
  });

  it('for a member of the Party', async () => {
    const [leader, friend] = await friends();
    await enter(app, friend, await partyOf(app, leader));

    const response = await invite(app, leader, friend.id);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_MEMBER'));
  });

  it('for a second invitation of the same Friend', async () => {
    const [leader, friend] = await friends();
    await invited(leader, friend);

    const response = await invite(app, leader, friend.id);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PARTY_INVITATION_ALREADY_SENT'));
  });
});

describe('The Leader’s part of invitations', () => {
  it('is refused to another member', async () => {
    const [leader, member] = await friends();
    const friend = await signInUser(app);
    await befriend(app, member, friend);
    await enter(app, member, await partyOf(app, leader));

    const response = await invite(app, member, friend.id);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject(refused(403, 'NOT_PARTY_LEADER'));
    expect((await getInvitations(app, friend)).body).toEqual([]);
  });

  it('is refused to a User in no Party', async () => {
    const [user, friend] = await friends();

    const response = await invite(app, user, friend.id);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
  });
});

describe('Accepting an invitation', () => {
  it.each(['open', 'approval', 'closed'])(
    'adds the User to a %s Party, ends the invitation, and tells every member',
    async (joinPolicy) => {
      const [leader, friend] = await friends();
      const [partyId, invitationId] = await invited(leader, friend, { joinPolicy });

      const response = await answerInvitation(app, friend, invitationId, 'accept');

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ id: partyId, members: [{ id: leader.id }, { id: friend.id }] });
      expect((await getInvitations(app, friend)).body).toEqual([]);
      await vi.waitFor(() => {
        expect(signalsTo(leader).filter((name) => name === 'party-changed')).toHaveLength(2);
        expect(signalsTo(friend).filter((name) => name === 'party-changed')).toHaveLength(2);
      });
    },
  );

  it('into a marked Party makes the User a Holder of its Quest', async () => {
    const [leader, friend] = await friends();
    const { questId } = await questFor(app, leader, (await storeEvent(prisma)).id);
    const [, invitationId] = await invited(leader, friend, { questId });

    await answerInvitation(app, friend, invitationId, 'accept');

    expect((await getQuests(app, friend)).body).toMatchObject([{ id: questId, holders: [{}, {}] }]);
  });
});

describe('Accepting an invitation is refused', () => {
  it('when the Party is full', async () => {
    const [leader, friend] = await friends();
    const [, invitationId] = await invited(leader, friend, { capacity: 1 });

    const response = await answerInvitation(app, friend, invitationId, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PARTY_FULL'));
    expect((await getInvitations(app, friend)).body).toHaveLength(1);
  });

  it('when the User is in a Party', async () => {
    const [leader, friend] = await friends();
    await partyOf(app, friend);
    const [, invitationId] = await invited(leader, friend);

    const response = await answerInvitation(app, friend, invitationId, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_IN_PARTY'));
  });

  it('to another User', async () => {
    const [leader, friend] = await friends();
    const [, invitationId] = await invited(leader, friend);

    const response = await answerInvitation(app, leader, invitationId, 'accept');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'PARTY_INVITATION_NOT_FOUND'));
  });
});

describe('Declining an invitation', () => {
  it('ends it, leaves the User out of the Party, and tells the User', async () => {
    const [leader, friend] = await friends();
    const [, invitationId] = await invited(leader, friend);

    const response = await answerInvitation(app, friend, invitationId, 'decline');

    expect(response.status).toBe(204);
    expect((await getInvitations(app, friend)).body).toEqual([]);
    expect((await getMyParty(app, friend)).status).toBe(404);
    await vi.waitFor(() => {
      expect(signalsTo(friend).filter((name) => name === 'party-changed')).toHaveLength(2);
    });
    expect((await answerInvitation(app, friend, invitationId, 'accept')).body).toMatchObject(
      refused(404, 'PARTY_INVITATION_NOT_FOUND'),
    );
  });
});
