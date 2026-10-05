import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { getMyParty, joinParty, leaveParty, openParty, partyOf, partyOfHolders } from './parties.js';
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

function partySignalsTo(user: TestUser): number {
  return watcher.for(user).filter(({ name }) => name === 'party-changed').length;
}

// A Party of a Quest the Leader and the others hold, which the others enter in the order given.
async function partyWith(leader: TestUser, others: TestUser[]): Promise<string> {
  return (await partyOfHolders(app, leader, others)).partyId;
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
    // As Holders of its Quest, each heard of the opening, of both entries and of the member leaving.
    await vi.waitFor(() => {
      expect(partySignalsTo(member)).toBe(4);
      expect(partySignalsTo(other)).toBe(4);
    });
  });

  it('by the Leader makes the member who entered earliest the Leader', async () => {
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
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const partyId = await partyWith(leader, [member]);

    await leaveParty(app, leader);
    await leaveParty(app, member);

    expect((await joinParty(app, member, partyId)).body).toMatchObject(refused(404, 'PARTY_NOT_FOUND'));
  });

  it('lets a Holder open a new Party for the Quest the ended one had', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId, questId } = await partyOfHolders(app, leader, [member]);
    await leaveParty(app, leader);
    await leaveParty(app, member);

    const response = await openParty(app, member, { questId });

    expect(response.status).toBe(201);
    expect(response.body).not.toMatchObject({ id: partyId });
    expect(response.body).toMatchObject({ quest: { id: questId } });
  });
});

describe('A Party', () => {
  it('goes on after every Sub Quest of its Quest has passed', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId } = await partyOfHolders(app, leader, [member]);

    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    expect((await getMyParty(app, leader)).body).toMatchObject({ id: partyId });
  });
});

describe('The Party and its Quest', () => {
  it('leaving and the Party’s end leave every Quest untouched', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId } = await partyOfHolders(app, leader, [member]);

    await leaveParty(app, member);
    await leaveParty(app, leader);

    expect((await getQuests(app, member)).body).toMatchObject([{ id: questId, holders: [{}, {}] }]);
    expect((await getQuests(app, leader)).body).toMatchObject([{ id: questId, holders: [{}, {}] }]);
  });

  it('dropping the Party’s Quest leaves the membership untouched', async () => {
    const [leader, member] = await Promise.all([signInUser(app), signInUser(app)]);
    const { partyId, questId } = await partyOfHolders(app, leader, [member]);

    await dropQuest(app, member, questId);

    expect((await getMyParty(app, member)).body).toMatchObject({ id: partyId, quest: { id: questId } });
    expect((await getMyParty(app, leader)).body).toMatchObject({ members: [{ id: leader.id }, { id: member.id }] });
  });

  it('the last Holder dropping the Party’s Quest leaves the Party tied to no Quest', async () => {
    const leader = await signInUser(app);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, leader, event.id);
    const partyId = await partyOf(app, leader, { questId });

    await dropQuest(app, leader, questId);

    expect((await getMyParty(app, leader)).body).toMatchObject({ id: partyId, quest: null });
  });
});
