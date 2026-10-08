import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { GlobalEvent, JoinPolicy, PrismaClient, QuestBoard } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { postAsMatchServer } from './match-server.js';
import { overlapOnLock } from './overlap.js';
import { connectToDatabase, getQuest, getQuests, joinQuest, questFor, storeEvent, storeSharedQuest } from './quests.js';
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
  await watcher.stop();
  await prisma.$disconnect();
  await app.close();
});

// A Quest for the Global Event held by these Users, led by the first, with the given settings.
async function questWith(
  event: Pick<GlobalEvent, 'id' | 'title'>,
  holders: readonly [TestUser, ...TestUser[]],
  { capacity = 3, joinPolicy = JoinPolicy.open }: { capacity?: number; joinPolicy?: JoinPolicy } = {},
): Promise<string> {
  const [leader, ...others] = holders.map(({ id }) => id);
  const questId = await storeSharedQuest(prisma, event, [leader ?? '', ...others]);
  const board = joinPolicy === JoinPolicy.closed ? null : QuestBoard.hobby;
  await prisma.quest.update({ where: { id: questId }, data: { capacity, joinPolicy, board } });
  return questId;
}

function eligibleQuests(pools: { globalEventId: string; size: number }[]): request.Test {
  return postAsMatchServer(app, '/matching-requests/eligible-quests', { pools });
}

function place(questId: string, user: TestUser, size = 3): request.Test {
  return postAsMatchServer(app, '/matching-requests/placements', { questId, userId: user.id, size });
}

async function createdAtOf(questId: string): Promise<string> {
  const { createdAt } = await prisma.quest.findUniqueOrThrow({ where: { id: questId } });
  return createdAt.toISOString();
}

describe('The eligible Quests for Matching', () => {
  it('are the Open Quests of each Global Event with a capacity of the size and a free place, the earliest first', async () => {
    const [leader, member, other, third] = await Promise.all([1, 2, 3, 4].map(() => signInUser(app)));
    const [event, second] = [await storeEvent(prisma), await storeEvent(prisma)];
    const earliest = await questWith(event, [leader, member]);
    const later = await questWith(event, [other], { capacity: 2 });
    const ofSecond = await questWith(second, [third]);

    const response = await eligibleQuests([
      { globalEventId: event.id, size: 3 },
      { globalEventId: event.id, size: 2 },
      { globalEventId: second.id, size: 3 },
    ]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      quests: [
        {
          id: earliest,
          globalEventId: event.id,
          capacity: 3,
          freePlaces: 1,
          holderIds: [leader.id, member.id],
          createdAt: await createdAtOf(earliest),
        },
        {
          id: later,
          globalEventId: event.id,
          capacity: 2,
          freePlaces: 1,
          holderIds: [other.id],
          createdAt: await createdAtOf(later),
        },
        {
          id: ofSecond,
          globalEventId: second.id,
          capacity: 3,
          freePlaces: 2,
          holderIds: [third.id],
          createdAt: await createdAtOf(ofSecond),
        },
      ],
    });
  });
});

describe('The Quests left out of the eligible ones', () => {
  it('are an Approval, a Closed, a full Quest, one of another capacity or event, and one with nothing ahead', async () => {
    const users = await Promise.all([1, 2, 3, 4, 5, 6, 7].map(() => signInUser(app)));
    const [event, other, ended] = [
      await storeEvent(prisma),
      await storeEvent(prisma),
      await storeEvent(prisma, { endsAt: new Date(Date.now() + 25 * 60 * 60 * 1000) }),
    ];
    await questWith(event, [users[0]], { joinPolicy: JoinPolicy.approval });
    await questWith(event, [users[1]], { joinPolicy: JoinPolicy.closed });
    await questWith(event, [users[2], users[3]], { capacity: 2 });
    await questWith(event, [users[4]], { capacity: 4 });
    await questWith(other, [users[5]]);
    await questWith(ended, [users[6]]);
    // After the end of `ended` and before that of `event`.
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date(Date.now() + 25.5 * 60 * 60 * 1000));

    const response = await eligibleQuests([
      { globalEventId: event.id, size: 3 },
      { globalEventId: event.id, size: 2 },
      { globalEventId: ended.id, size: 3 },
    ]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ quests: [] });
  });
});

describe('A placement into an Open Quest', () => {
  it('adds the User as a Holder and answers the Holders', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const questId = await questWith(event, [leader]);

    const response = await place(questId, user);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ questId, holderIds: [leader.id, user.id] });
    expect((await getQuest(app, user, questId)).body).toMatchObject({
      leader: { id: leader.id },
      holders: [{ id: leader.id }, { id: user.id }],
    });
  });

  it('takes the place of a Quest the User held alone for the Global Event', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const questId = await questWith(event, [leader]);
    const { questId: heldAlone } = await questFor(app, user, event.id);

    const response = await place(questId, user);

    expect(response.status).toBe(201);
    expect((await getQuests(app, user)).body).toMatchObject([{ id: questId }]);
    expect(await prisma.quest.count({ where: { id: heldAlone } })).toBe(0);
  });

  it('is answered as entered when the User holds the Quest already', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const questId = await questWith(event, [leader]);
    await place(questId, user);

    const response = await place(questId, user);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ questId, holderIds: [leader.id, user.id] });
  });
});

describe('A placement into a Quest that does not take the User', () => {
  it.each([
    ['an unknown Quest', 404, 'QUEST_NOT_FOUND', (): Promise<string> => Promise.resolve(randomUUID())],
    ['an Approval Quest', 409, 'QUEST_NOT_OPEN', { joinPolicy: JoinPolicy.approval }],
    ['a Closed Quest', 409, 'QUEST_NOT_OPEN', { joinPolicy: JoinPolicy.closed }],
    ['a Quest of another capacity', 409, 'QUEST_CAPACITY_DIFFERS', { capacity: 4 }],
    ['a full Quest', 409, 'QUEST_FULL', { capacity: 3, full: true }],
  ] as const)('is refused for %s', async (_, status, code, quest) => {
    const [leader, member, other, user] = await Promise.all([1, 2, 3, 4].map(() => signInUser(app)));
    const event = await storeEvent(prisma);
    const questId =
      typeof quest === 'function'
        ? await quest()
        : await questWith(event, 'full' in quest ? [leader, member, other] : [leader], quest);

    const response = await place(questId, user);

    expect(response.status).toBe(status);
    expect(response.body).toMatchObject(refused(status, code));
    expect((await getQuests(app, user)).body).toEqual([]);
  });

  it('is refused for a Quest with no Sub Quest ahead', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const questId = await questWith(event, [leader]);
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    const response = await place(questId, user);

    expect(response.body).toMatchObject(refused(409, 'QUEST_ENDED'));
  });
});

describe('A placement that cannot be made', () => {
  it('is refused for a User who holds a Shared Quest for the Global Event, who keeps it', async () => {
    const [leader, user, partner] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const questId = await questWith(event, [leader]);
    const shared = await storeSharedQuest(prisma, event, [user.id, partner.id]);

    const response = await place(questId, user);

    expect(response.body).toMatchObject(refused(409, 'SHARED_QUEST_HELD'));
    expect((await getQuests(app, user)).body).toMatchObject([{ id: shared }]);
  });

  it.each([
    ['without a Quest', { userId: randomUUID(), size: 3 }],
    ['with a size outside 2 to 4', { questId: randomUUID(), userId: randomUUID(), size: 5 }],
  ])('is a bad request %s', async (_, body) => {
    const response = await postAsMatchServer(app, '/matching-requests/placements', body);

    expect(response.status).toBe(400);
  });
});

describe('A placement and a User joining the last free place at the same moment', () => {
  it('leave one of them a Holder', async () => {
    const [leader, member, placed, joining] = await Promise.all([1, 2, 3, 4].map(() => signInUser(app)));
    const event = await storeEvent(prisma);
    const questId = await questWith(event, [leader, member]);

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM quests WHERE id = ${questId}::uuid FOR UPDATE`,
      () => place(questId, placed),
      () => joinQuest(app, joining, questId),
    );

    expect(answers[0].status).toBe(201);
    expect(answers[1].body).toMatchObject(refused(409, 'QUEST_FULL'));
    expect((await getQuest(app, leader, questId)).body).toMatchObject({
      holders: [{ id: leader.id }, { id: member.id }, { id: placed.id }],
    });
  });
});

describe('The signals of a placement', () => {
  it('are matching-changed to the User and quests-changed to the Holders, once', async () => {
    const [leader, member, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const questId = await questWith(event, [leader, member]);

    await place(questId, user);
    await place(questId, user);

    await vi.waitFor(() => {
      expect(watcher.for(user).map(({ name }) => name)).toEqual(['matching-changed', 'quests-changed']);
      expect(watcher.for(leader).map(({ name }) => name)).toEqual(['quests-changed']);
    });
    expect(watcher.for(member).map(({ name }) => name)).toEqual(['quests-changed']);
  });
});
