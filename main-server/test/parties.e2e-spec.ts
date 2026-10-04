import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { createParty, enter, getMyParty, listedIds, listParties, partyOf } from './parties.js';
import { connectToDatabase, markDone, questFor, storeEvent } from './quests.js';
import { ANY_STRING, refused } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// Moves the time by which Sub Quests end.
function setClock(at: Date): void {
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(at);
}

// A Quest for a new Global Event held by the User, with the event.
async function questOf(user: TestUser): Promise<{ questId: string; attendingId: string; globalEventId: string }> {
  const event = await storeEvent(prisma);
  return { ...(await questFor(app, user, event.id)), globalEventId: event.id };
}

describe('Creating a Party', () => {
  it('makes the creator its Leader and first member, with a capacity of 4 when left out', async () => {
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });

    const response = await createParty(app, user, { title: '점심 같이', joinPolicy: 'approval' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: ANY_STRING,
      title: '점심 같이',
      capacity: 4,
      joinPolicy: 'approval',
      mark: null,
      sharing: true,
      members: [{ id: user.id, name: '김철수', department: '경영학과', leader: true, visible: false }],
    });
    expect((await getMyParty(app, user)).body).toEqual(response.body);
  });

  it.each([1, 8])('takes a capacity of %i', async (capacity) => {
    const user = await signInUser(app);

    const response = await createParty(app, user, { capacity });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ capacity });
  });

  it.each([
    ['a capacity of 0', { capacity: 0 }],
    ['a capacity of 9', { capacity: 9 }],
    ['an empty title', { title: ' ' }],
    ['an unknown Join Policy', { joinPolicy: 'secret' }],
  ])('refuses %s', async (_case, body) => {
    const user = await signInUser(app);

    const response = await createParty(app, user, body);

    expect(response.status).toBe(400);
    expect((await getMyParty(app, user)).status).toBe(404);
  });
});

describe('Creating a marked Party', () => {
  it('marks the Party with one of the creator’s Quests', async () => {
    const user = await signInUser(app);
    const { questId, globalEventId } = await questOf(user);

    const response = await createParty(app, user, { questId });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      mark: {
        questId,
        title: '지능형통신 연합전공 설명회',
        globalEvent: { id: globalEventId, title: '지능형통신 연합전공 설명회' },
      },
    });
  });

  it('takes a Quest whose Sub Quests the creator marked done while their time is ahead', async () => {
    const user = await signInUser(app);
    const { questId, attendingId } = await questOf(user);
    await markDone(app, user, { questId, subQuestId: attendingId });

    expect((await createParty(app, user, { questId })).status).toBe(201);
  });
});

describe('Creating a Party is refused', () => {
  it('to a User in a Party', async () => {
    const user = await signInUser(app);
    await partyOf(app, user);

    const response = await createParty(app, user);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_IN_PARTY'));
  });

  it.each([
    ['a Quest of another User', 'other'],
    ['an id that is no stored Quest', 'nobody'],
  ] as const)('with %s as its mark', async (_case, whose) => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const ids = { other: (await questOf(other)).questId, nobody: randomUUID() };

    const response = await createParty(app, user, { questId: ids[whose] });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    expect((await getMyParty(app, user)).status).toBe(404);
  });

  it('with a Quest whose Sub Quests have all passed as its mark', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, user, event.id);
    setClock(event.endsAt ?? new Date());

    const response = await createParty(app, user, { questId });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_ENDED'));
  });

  it('for a Quest that a running Party carries, and names that Party', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId, globalEventId } = await questOf(user);
    await prisma.questHolder.create({ data: { questId, userId: other.id, globalEventId } });
    const partyId = await partyOf(app, user, { questId });

    const response = await createParty(app, other, { questId });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ ...refused(409, 'PARTY_EXISTS_FOR_QUEST'), partyId });
  });
});

describe('Reading the User’s Party', () => {
  it('gives the members in the order they joined, with the Leader marked', async () => {
    const [leader, second, third] = await Promise.all([
      signInUser(app, { name: '다', department: '경영학과' }),
      signInUser(app, { name: '가', department: '경영학과' }),
      signInUser(app, { name: '나', department: '경영학과' }),
    ]);
    const partyId = await partyOf(app, leader);
    await enter(app, second, partyId);
    await enter(app, third, partyId);

    const response = await getMyParty(app, third);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: partyId,
      members: [
        { id: leader.id, name: '다', leader: true, visible: false },
        { id: second.id, name: '가', leader: false, visible: false },
        { id: third.id, name: '나', leader: false, visible: false },
      ],
    });
  });

  it('is refused to a User in no Party', async () => {
    const user = await signInUser(app);

    const response = await getMyParty(app, user);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'NOT_IN_PARTY'));
  });
});

describe('The list of Parties', () => {
  it('has the Open and Approval Parties, the newest first, and no Closed one', async () => {
    const [reader, open, approval, closed] = await Promise.all([
      signInUser(app),
      signInUser(app),
      signInUser(app),
      signInUser(app),
    ]);
    const openId = await partyOf(app, open, { joinPolicy: 'open' });
    const approvalId = await partyOf(app, approval, { joinPolicy: 'approval' });
    const closedId = await partyOf(app, closed, { joinPolicy: 'closed' });

    const ids = await listedIds(app, reader);

    expect(ids.filter((id) => [openId, approvalId, closedId].includes(id))).toEqual([approvalId, openId]);
  });

  it('gives each Party’s title, capacity, Join Policy, number of members and mark', async () => {
    const [reader, leader, member] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const { questId, globalEventId } = await questOf(leader);
    const partyId = await partyOf(app, leader, { title: '설명회 같이', capacity: 3, questId });
    await enter(app, member, partyId);

    const response = await listParties(app, reader, globalEventId);

    expect(response.body).toEqual([
      {
        id: partyId,
        title: '설명회 같이',
        capacity: 3,
        joinPolicy: 'open',
        memberCount: 2,
        mark: {
          questId,
          title: '지능형통신 연합전공 설명회',
          globalEvent: { id: globalEventId, title: '지능형통신 연합전공 설명회' },
        },
      },
    ]);
  });
});

describe('The list of Parties for a Global Event', () => {
  it('has the Open and Approval Parties marked with a Quest of that event, and no other', async () => {
    const [reader, open, approval, closed, unmarked, elsewhere] = await Promise.all(
      Array.from({ length: 6 }, () => signInUser(app)),
    );
    const event = await storeEvent(prisma);
    const quests = await Promise.all([open, approval, closed].map((user) => questFor(app, user, event.id)));
    const [openId, approvalId] = await Promise.all([
      partyOf(app, open, { questId: quests[0]?.questId }),
      partyOf(app, approval, { questId: quests[1]?.questId, joinPolicy: 'approval' }),
      partyOf(app, closed, { questId: quests[2]?.questId, joinPolicy: 'closed' }),
      partyOf(app, unmarked),
      partyOf(app, elsewhere, { questId: (await questOf(elsewhere)).questId }),
    ]);

    const ids = await listedIds(app, reader, event.id);

    expect(new Set(ids)).toEqual(new Set([openId, approvalId]));
  });

  it('leaves out a Party once its Quest has no Sub Quest ahead', async () => {
    const [reader, leader] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, leader, event.id);
    const partyId = await partyOf(app, leader, { questId });
    const endsAt = event.endsAt ?? new Date();

    setClock(new Date(endsAt.getTime() - 1));
    const before = await listedIds(app, reader, event.id);
    setClock(endsAt);
    const after = await listedIds(app, reader, event.id);

    expect(before).toEqual([partyId]);
    expect(after).toEqual([]);
    expect(await listedIds(app, reader)).toContain(partyId);
  });

  it('keeps a Party whose Holders marked every Sub Quest done, since that is each Holder’s own', async () => {
    const [reader, leader] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const { questId, attendingId } = await questFor(app, leader, event.id);
    const partyId = await partyOf(app, leader, { questId });

    await markDone(app, leader, { questId, subQuestId: attendingId });

    expect(await listedIds(app, reader, event.id)).toEqual([partyId]);
  });
});
