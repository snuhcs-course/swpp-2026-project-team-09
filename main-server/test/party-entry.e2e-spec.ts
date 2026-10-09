// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #46
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { enter, getMyParty, joinParty, leaveParty, partyOf, partyOfHolders, sharedQuest } from './parties.js';
import { connectToDatabase, getQuest, getQuests, questFor, storeEvent } from './quests.js';
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

// How many `party-changed` signals went to the User.
function partyChangedTo(user: TestUser): number {
  return watcher.for(user).filter(({ name }) => name === 'party-changed').length;
}

describe('A Holder of the Party’s Quest', () => {
  it.each(['open', 'approval', 'closed'])('enters a %s Party at once', async (joinPolicy) => {
    const [leader, holder] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await sharedQuest(app, leader, [holder]);
    const partyId = await partyOf(app, leader, { questId, joinPolicy });

    const response = await joinParty(app, holder, partyId);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: partyId,
      members: [
        { id: leader.id, leader: true },
        { id: holder.id, leader: false },
      ],
    });
    expect((await getMyParty(app, leader)).body).toEqual(response.body);
  });

  it('is refused when the Party is full', async () => {
    const [leader, holder] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await sharedQuest(app, leader, [holder]);
    const partyId = await partyOf(app, leader, { questId, capacity: 1 });

    const response = await joinParty(app, holder, partyId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PARTY_FULL'));
    expect((await getMyParty(app, holder)).status).toBe(404);
  });
});

describe('A Friend of a member', () => {
  it('enters an Open Party at once, also as the Friend of a member who is not its Leader', async () => {
    const [leader, member, friend] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, member, friend);
    const { partyId } = await partyOfHolders(app, leader, [member], { joinPolicy: 'open' });

    const response = await joinParty(app, friend, partyId);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ members: [{ id: leader.id }, { id: member.id }, { id: friend.id }] });
  });

  it.each(['approval', 'closed'])('is refused by a %s Party', async (joinPolicy) => {
    const [leader, friend] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, leader, friend);
    const partyId = await partyOf(app, leader, { joinPolicy });

    const response = await joinParty(app, friend, partyId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PARTY_NOT_OPEN'));
    expect((await getMyParty(app, friend)).status).toBe(404);
  });

  it('is refused when the Party is full', async () => {
    const [leader, friend] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, leader, friend);
    const partyId = await partyOf(app, leader, { joinPolicy: 'open', capacity: 1 });

    const response = await joinParty(app, friend, partyId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PARTY_FULL'));
  });
});

describe('A User who is neither a Holder of the Party’s Quest nor a Friend of a member', () => {
  it.each(['open', 'approval', 'closed'])('is refused by a %s Party as for an unknown one', async (joinPolicy) => {
    const [leader, holder, stranger] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const { partyId } = await partyOfHolders(app, leader, [holder], { joinPolicy });

    const response = await joinParty(app, stranger, partyId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'PARTY_NOT_FOUND'));
    expect((await getMyParty(app, stranger)).status).toBe(404);
  });
});

describe('Entering is refused', () => {
  it.each([
    ['another Party', 'other'],
    ['the same Party', 'same'],
  ] as const)('to a User in a Party, entering %s', async (_case, which) => {
    const [leader, other, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, leader, user);
    await befriend(app, other, user);
    const partyId = await partyOf(app, leader, { joinPolicy: 'open' });
    const otherId = await partyOf(app, other, { joinPolicy: 'open' });
    await enter(app, user, partyId);

    const response = await joinParty(app, user, which === 'same' ? partyId : otherId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_IN_PARTY'));
    expect((await getMyParty(app, user)).body).toMatchObject({ id: partyId });
  });

  it('for a Party that is not running', async () => {
    const user = await signInUser(app);

    const response = await joinParty(app, user, randomUUID());

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'PARTY_NOT_FOUND'));
  });
});

describe('Entering a Party', () => {
  it('changes no Quest of a Friend who does not hold its Quest', async () => {
    const [leader, friend] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, leader, friend);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, leader, event.id);
    const own = await questFor(app, friend, event.id);
    const partyId = await partyOf(app, leader, { questId, joinPolicy: 'open' });

    await enter(app, friend, partyId);

    expect((await getQuests(app, friend)).body).toMatchObject([{ id: own.questId, holders: [{ id: friend.id }] }]);
    expect((await getQuest(app, leader, questId)).body).toMatchObject({ holders: [{ id: leader.id }] });
    expect((await getQuest(app, friend, questId)).status).toBe(404);
  });

  it('changes no Quest of a Holder', async () => {
    const [leader, holder] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId } = await partyOfHolders(app, leader, [holder]);

    expect((await getQuests(app, holder)).body).toMatchObject([
      { id: questId, holders: [{ id: leader.id }, { id: holder.id }] },
    ]);
  });
});

// How many `party-changed` signals went to each User.
function partyChangedCounts(...users: TestUser[]): number[] {
  return users.map((user) => partyChangedTo(user));
}

interface Around {
  leader: TestUser;
  holder: TestUser;
  leaderFriend: TestUser;
  holderFriend: TestUser;
  stranger: TestUser;
  questId: string;
}

// A Quest of the Leader's that the Holder holds too, a Friend of each and a User who is none of these.
async function around(): Promise<Around> {
  const [leader, holder, leaderFriend, holderFriend, stranger] = await Promise.all(
    Array.from({ length: 5 }, () => signInUser(app)),
  );
  await befriend(app, leader, leaderFriend);
  await befriend(app, holder, holderFriend);
  const questId = await sharedQuest(app, leader, [holder]);
  return { leader, holder, leaderFriend, holderFriend, stranger, questId };
}

describe('party-changed when a Party opens and ends', () => {
  it('goes to the members, the Holders of its Quest and the Friends of its members when it opens', async () => {
    const { leader, holder, leaderFriend, holderFriend, stranger, questId } = await around();

    await partyOf(app, leader, { questId });

    await vi.waitFor(() => {
      expect(partyChangedCounts(leader, holder, leaderFriend)).toEqual([1, 1, 1]);
    });
    expect(partyChangedCounts(holderFriend, stranger)).toEqual([0, 0]);
  });

  it('goes to them when the Party ends', async () => {
    const { leader, holder, leaderFriend, stranger, questId } = await around();
    await partyOf(app, leader, { questId });

    await leaveParty(app, leader);

    await vi.waitFor(() => {
      expect(partyChangedCounts(leader, holder, leaderFriend)).toEqual([2, 2, 2]);
    });
    expect(partyChangedTo(stranger)).toBe(0);
  });
});

describe('party-changed when the members change', () => {
  it('goes to them when a member enters, the Friends of the new member included', async () => {
    const { leader, holder, leaderFriend, holderFriend, stranger, questId } = await around();
    const partyId = await partyOf(app, leader, { questId });

    await enter(app, holder, partyId);

    await vi.waitFor(() => {
      expect(partyChangedCounts(leader, holder, leaderFriend, holderFriend)).toEqual([2, 2, 2, 1]);
    });
    expect(partyChangedTo(stranger)).toBe(0);
  });

  it('goes to them when a member leaves, the one who left and their Friends included', async () => {
    const { leader, holder, leaderFriend, holderFriend, stranger, questId } = await around();
    const partyId = await partyOf(app, leader, { questId });
    await enter(app, holder, partyId);

    await leaveParty(app, holder);

    await vi.waitFor(() => {
      expect(partyChangedCounts(leader, holder, leaderFriend, holderFriend)).toEqual([3, 3, 3, 2]);
    });
    expect(partyChangedTo(stranger)).toBe(0);
  });
});
