// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #46
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { getMyParty, openParty, partyOf, partyOfHolders, sharedQuest } from './parties.js';
import { connectToDatabase, markDone, ownQuest, questFor, storeEvent } from './quests.js';
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

describe('Opening a Party', () => {
  it('makes the opener its Leader and first member, Closed with a capacity of 4 when left out', async () => {
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });

    const response = await openParty(app, user, { title: '점심 같이' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: ANY_STRING,
      title: '점심 같이',
      capacity: 4,
      joinPolicy: 'closed',
      quest: null,
      sharing: true,
      members: [{ id: user.id, name: '김철수', department: '경영학과', leader: true, visible: false }],
    });
    expect((await getMyParty(app, user)).body).toEqual(response.body);
  });
});

describe('Opening a Party with settings', () => {
  it.each(['open', 'approval', 'closed'])('takes the Join Policy %s', async (joinPolicy) => {
    const user = await signInUser(app);

    const response = await openParty(app, user, { joinPolicy });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ joinPolicy });
  });

  it.each([1, 8])('takes a capacity of %i', async (capacity) => {
    const user = await signInUser(app);

    const response = await openParty(app, user, { capacity });

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

    const response = await openParty(app, user, body);

    expect(response.status).toBe(400);
    expect((await getMyParty(app, user)).status).toBe(404);
  });
});

describe('Opening the Party of a Quest', () => {
  it('ties the Party to one of the opener’s Quests for a Global Event', async () => {
    const user = await signInUser(app);
    const { questId, globalEventId } = await questOf(user);

    const response = await openParty(app, user, { questId });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      quest: {
        id: questId,
        title: '지능형통신 연합전공 설명회',
        globalEvent: { id: globalEventId, title: '지능형통신 연합전공 설명회' },
      },
    });
  });

  it('ties the Party to a Quest without a Global Event', async () => {
    const user = await signInUser(app);
    const questId = await ownQuest(app, user, { title: '저녁 같이 먹어요' });

    const response = await openParty(app, user, { questId });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ quest: { id: questId, title: '저녁 같이 먹어요', globalEvent: null } });
  });

  it('takes a Quest whose Sub Quests the opener marked done while their time is ahead', async () => {
    const user = await signInUser(app);
    const { questId, attendingId } = await questOf(user);
    await markDone(app, user, { questId, subQuestId: attendingId });

    expect((await openParty(app, user, { questId })).status).toBe(201);
  });
});

describe('Opening a Party is refused', () => {
  it('to a User in a Party', async () => {
    const user = await signInUser(app);
    await partyOf(app, user);

    const response = await openParty(app, user);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_IN_PARTY'));
  });

  // A Class Quest is computed and never stored, so its id is no stored Quest either.
  it.each([
    ['a Quest of another User', 'other'],
    ['an id that is no stored Quest', 'nobody'],
  ] as const)('with %s', async (_case, whose) => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const ids = { other: (await questOf(other)).questId, nobody: randomUUID() };

    const response = await openParty(app, user, { questId: ids[whose] });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    expect((await getMyParty(app, user)).status).toBe(404);
  });

  it('with a Quest whose Sub Quests have all passed', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, user, event.id);
    setClock(event.endsAt ?? new Date());

    const response = await openParty(app, user, { questId });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_ENDED'));
  });

  it('for a Quest that a running Party has, and names that Party', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await sharedQuest(app, user, [other]);
    const partyId = await partyOf(app, user, { questId });

    const response = await openParty(app, other, { questId });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ ...refused(409, 'PARTY_EXISTS_FOR_QUEST'), partyId });
  });
});

describe('Reading the User’s Party', () => {
  it('gives the members in the order they entered, with the Leader marked', async () => {
    const [leader, second, third] = await Promise.all([
      signInUser(app, { name: '다', department: '경영학과' }),
      signInUser(app, { name: '가', department: '경영학과' }),
      signInUser(app, { name: '나', department: '경영학과' }),
    ]);
    const { partyId } = await partyOfHolders(app, leader, [second, third]);

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
