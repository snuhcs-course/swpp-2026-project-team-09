import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { createParty, enter, getMyParty, joinParty, leaveParty, listedIds, partyOf } from './parties.js';
import { connectToDatabase, dropQuest, getQuests, questFor, storeEvent } from './quests.js';
import { refused, SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
  prisma = connectToDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await watcher.stop();
  await app.close();
});

// A Party of the Leader and the others, who join in the order given.
async function partyWith(leader: TestUser, others: TestUser[], body: object = {}): Promise<string> {
  const partyId = await partyOf(app, leader, body);
  await others.reduce(async (previous, other) => {
    await previous;
    await enter(app, other, partyId);
  }, Promise.resolve());
  return partyId;
}

// A Party marked with the Leader's Quest for a new Global Event, which the member joins and so holds too.
async function markedPartyWith(
  leader: TestUser,
  member: TestUser,
): Promise<{ partyId: string; questId: string; globalEventId: string }> {
  const event = await storeEvent(prisma);
  const { questId } = await questFor(app, leader, event.id);
  const partyId = await partyWith(leader, [member], { questId });
  return { partyId, questId, globalEventId: event.id };
}

describe('Leaving a Party', () => {
  it('takes the member out, and tells every member, the one who left included', async () => {
    const [leader, member, other] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const partyId = await partyWith(leader, [member, other]);

    const response = await leaveParty(app, member);

    expect(response.status).toBe(204);
    expect((await getMyParty(app, member)).body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
    expect((await getMyParty(app, other)).body).toMatchObject({
      id: partyId,
      members: [
        { id: leader.id, leader: true },
        { id: other.id, leader: false },
      ],
    });
    // Each joined, the other joined after the member, and the member left.
    await vi.waitFor(() => {
      expect(watcher.for(member).map(({ name }) => name)).toEqual(['party-changed', 'party-changed', 'party-changed']);
      expect(watcher.for(other).map(({ name }) => name)).toEqual(['party-changed', 'party-changed']);
    });
  });

  it('by the Leader makes the member who joined earliest the Leader', async () => {
    const [leader, second, third] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await partyWith(leader, [second, third]);

    await leaveParty(app, leader);

    expect((await getMyParty(app, third)).body).toMatchObject({
      members: [
        { id: second.id, leader: true },
        { id: third.id, leader: false },
      ],
    });
  });
});

describe('A member who left', () => {
  it('may enter the Party again', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const partyId = await partyWith(leader, [member]);
    await leaveParty(app, member);

    expect((await joinParty(app, member, partyId)).status).toBe(201);
  });
});

describe('Leaving is refused', () => {
  it('to a User in no Party', async () => {
    const user = await signInUser(app);

    const response = await leaveParty(app, user);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
  });
});

describe('The last member leaving', () => {
  it('ends the Party', async () => {
    const [leader, member, reader] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const partyId = await partyWith(leader, [member]);

    await leaveParty(app, leader);
    await leaveParty(app, member);

    expect(await listedIds(app, reader)).not.toContain(partyId);
    expect((await joinParty(app, reader, partyId)).body).toMatchObject(refused(404, 'PARTY_NOT_FOUND'));
  });

  it('lets a Holder create a new Party for the Quest the ended one carried', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId, questId } = await markedPartyWith(leader, member);
    await leaveParty(app, leader);
    await leaveParty(app, member);

    const response = await createParty(app, member, { questId });

    expect(response.status).toBe(201);
    expect(response.body).not.toMatchObject({ id: partyId });
    expect(response.body).toMatchObject({ mark: { questId } });
  });
});

describe('A Party', () => {
  it('goes on after every Sub Quest of its Quest has passed', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId } = await markedPartyWith(leader, member);

    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    expect((await getMyParty(app, leader)).body).toMatchObject({ id: partyId });
  });
});

describe('The Party and its Quest after entry', () => {
  it('leaving and the Party’s end leave every Quest untouched', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId } = await markedPartyWith(leader, member);

    await leaveParty(app, member);
    await leaveParty(app, leader);

    expect((await getQuests(app, member)).body).toMatchObject([{ id: questId, holders: [{}, {}] }]);
    expect((await getQuests(app, leader)).body).toMatchObject([{ id: questId, holders: [{}, {}] }]);
  });

  it('dropping the marked Quest leaves the membership untouched', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId, questId } = await markedPartyWith(leader, member);

    await dropQuest(app, member, questId);

    expect((await getMyParty(app, member)).body).toMatchObject({ id: partyId, mark: { questId } });
    expect((await getMyParty(app, leader)).body).toMatchObject({ members: [{ id: leader.id }, { id: member.id }] });
  });

  it('the last Holder dropping the marked Quest leaves the Party without a mark', async () => {
    const leader = await signInUser(app);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, leader, event.id);
    const partyId = await partyOf(app, leader, { questId });

    await dropQuest(app, leader, questId);

    expect((await getMyParty(app, leader)).body).toMatchObject({ id: partyId, mark: null });
  });
});
