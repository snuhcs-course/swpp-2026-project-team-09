import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import { enter, getMyParty, joinParty, partyOf } from './parties.js';
import { connectToDatabase, getQuest, getQuests, markDone, questFor, storeEvent, subQuestIn } from './quests.js';
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

// The names of the signals that went to the User, in order.
function signalsTo(user: TestUser): string[] {
  return watcher.for(user).map(({ name }) => name);
}

// A Party marked with the Leader's Quest for a new Global Event.
async function markedParty(
  leader: TestUser,
  joinPolicy = 'open',
): Promise<{ partyId: string; questId: string; globalEventId: string }> {
  const event = await storeEvent(prisma);
  const { questId } = await questFor(app, leader, event.id);
  const partyId = await partyOf(app, leader, { questId, joinPolicy });
  return { partyId, questId, globalEventId: event.id };
}

describe('Joining an Open Party', () => {
  it('makes the User a member at once, and tells every member', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const partyId = await partyOf(app, leader);

    const response = await joinParty(app, user, partyId);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: partyId,
      members: [
        { id: leader.id, leader: true },
        { id: user.id, leader: false },
      ],
    });
    expect((await getMyParty(app, leader)).body).toEqual(response.body);
    await vi.waitFor(() => {
      expect(signalsTo(leader)).toEqual(['party-changed', 'party-changed']);
      expect(signalsTo(user)).toEqual(['party-changed']);
    });
  });
});

describe('Joining is refused', () => {
  it.each(['approval', 'closed'])('to a User who holds no Quest the %s Party is marked with', async (joinPolicy) => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const partyId = await partyOf(app, leader, { joinPolicy });

    const response = await joinParty(app, user, partyId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PARTY_NOT_OPEN'));
  });

  it('when the Party is full', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const partyId = await partyOf(app, leader, { capacity: 1 });

    const response = await joinParty(app, user, partyId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'PARTY_FULL'));
    expect((await getMyParty(app, user)).status).toBe(404);
  });

  it.each([
    ['another Party', 'other'],
    ['the same Party', 'same'],
  ] as const)('to a User in a Party, joining %s', async (_case, which) => {
    const [leader, other, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const partyId = await partyOf(app, leader);
    const otherId = await partyOf(app, other);
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

describe('A Holder of the marked Quest', () => {
  it.each(['open', 'approval', 'closed'])('joins a %s Party at once', async (joinPolicy) => {
    const [leader, holder] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId, questId, globalEventId } = await markedParty(leader, joinPolicy);
    await prisma.questHolder.create({ data: { questId, userId: holder.id, globalEventId } });

    const response = await joinParty(app, holder, partyId);

    expect(response.status).toBe(201);
    expect((await getQuests(app, holder)).body).toMatchObject([{ id: questId }]);
  });

  it('is refused when the Party is full', async () => {
    const [leader, holder] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, leader, event.id);
    const partyId = await partyOf(app, leader, { questId, joinPolicy: 'closed', capacity: 1 });
    await prisma.questHolder.create({ data: { questId, userId: holder.id, globalEventId: event.id } });

    const response = await joinParty(app, holder, partyId);

    expect(response.body).toMatchObject(refused(409, 'PARTY_FULL'));
  });
});

describe('Entering a marked Party without holding its Quest', () => {
  it('makes the User a Holder of it, and tells every Holder', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId, questId } = await markedParty(leader);

    await enter(app, user, partyId);

    expect((await getQuest(app, user, questId)).status).toBe(200);
    expect((await getQuest(app, leader, questId)).body).toMatchObject({ holders: [{}, {}] });
    await vi.waitFor(() => {
      expect(signalsTo(user)).toEqual(['party-changed', 'quests-changed']);
      expect(signalsTo(leader).filter((name) => name === 'quests-changed')).toHaveLength(2);
    });
  });

  it('deletes the Quest the User held alone for the Global Event, with its Sub Quests and the User’s progress', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId, questId, globalEventId } = await markedParty(leader);
    const own = await questFor(app, user, globalEventId);
    const subQuestId = await subQuestIn(app, user, own.questId);
    await markDone(app, user, { questId: own.questId, subQuestId });

    await enter(app, user, partyId);

    expect((await getQuests(app, user)).body).toMatchObject([{ id: questId }]);
    expect(await prisma.quest.count({ where: { id: own.questId } })).toBe(0);
    expect(await prisma.subQuest.count({ where: { questId: own.questId } })).toBe(0);
    expect(await prisma.subQuestProgress.count({ where: { subQuestId } })).toBe(0);
  });
});

describe('Entering a marked Party while holding a Shared Quest for its Global Event', () => {
  it('leaves the User with that Quest, and no Holder of the mark', async () => {
    const [leader, user, companion] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const { partyId, questId, globalEventId } = await markedParty(leader);
    const shared = await questFor(app, user, globalEventId);
    await prisma.questHolder.create({ data: { questId: shared.questId, userId: companion.id, globalEventId } });

    await enter(app, user, partyId);

    expect((await getQuests(app, user)).body).toMatchObject([{ id: shared.questId }]);
    expect((await getQuest(app, leader, questId)).body).toMatchObject({ holders: [{ id: leader.id }] });
    expect((await getMyParty(app, user)).body).toMatchObject({ id: partyId });
  });
});

describe('Entering a Party marked with a Quest without a Global Event', () => {
  it('makes the User a Holder of it', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const quest = await prisma.quest.create({
      data: {
        title: '저녁 약속',
        leaderId: leader.id,
        holders: { create: { userId: leader.id } },
        subQuests: { create: { title: '저녁', endsAt: new Date(Date.now() + 60 * 60 * 1000) } },
      },
    });
    const partyId = await partyOf(app, leader, { questId: quest.id });

    await enter(app, user, partyId);

    expect((await getQuests(app, user)).body).toMatchObject([{ id: quest.id, globalEvent: null }]);
  });
});
