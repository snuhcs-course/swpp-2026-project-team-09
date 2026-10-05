import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { JoinPolicy, PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import {
  connectToDatabase,
  getQuest,
  getQuests,
  joinQuest,
  markDone,
  ownQuest,
  questFor,
  storeEvent,
  subQuestIn,
} from './quests.js';
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

// The User's Quest for the Global Event, under the Join Policy given, as the Leader sets it in ticket 14.
async function attendedQuest(user: TestUser, globalEventId: string, joinPolicy: JoinPolicy = 'open'): Promise<string> {
  const { questId } = await questFor(app, user, globalEventId);
  await prisma.quest.update({ where: { id: questId }, data: { joinPolicy } });
  return questId;
}

describe('Joining an Open Quest', () => {
  it('makes the User a Holder at once, after the Holders who entered before', async () => {
    const [leader, user] = await Promise.all([
      signInUser(app, { name: '홍길동', department: '컴퓨터공학부' }),
      signInUser(app, { name: '김철수', department: '경영학과' }),
    ]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });

    const response = await joinQuest(app, user, questId);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: questId,
      leader: { id: leader.id },
      holders: [{ id: leader.id }, { id: user.id, name: '김철수', department: '경영학과' }],
    });
    expect((await getQuests(app, user)).body).toEqual([response.body]);
  });

  it('tells every Holder, the User included', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });

    await joinQuest(app, user, questId);

    // Making the Quest, then the User's joining.
    await vi.waitFor(() => {
      expect(watcher.for(leader).map(({ name }) => name)).toEqual(['quests-changed', 'quests-changed']);
      expect(watcher.for(user).map(({ name }) => name)).toEqual(['quests-changed']);
    });
  });
});

describe('Joining a Quest that does not take the User', () => {
  it.each([
    ['an Approval Quest', { joinPolicy: 'approval' }, 409, 'QUEST_NOT_OPEN'],
    ['a Closed Quest', { joinPolicy: 'closed' }, 404, 'QUEST_NOT_FOUND'],
    ['a full Quest', { joinPolicy: 'open', capacity: 1 }, 409, 'QUEST_FULL'],
    [
      'a Quest whose Sub Quests have all passed',
      { joinPolicy: 'open', subQuest: { title: '점심', endsAt: new Date(Date.now() - 1000).toISOString() } },
      409,
      'QUEST_ENDED',
    ],
  ])('is refused: %s', async (_case, body, status, code) => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, body);

    const response = await joinQuest(app, user, questId);

    expect(response.body).toMatchObject(refused(status, code));
    expect((await getQuest(app, leader, questId)).body).toMatchObject({ holders: [{ id: leader.id }] });
  });

  it('is refused for an unknown Quest', async () => {
    const user = await signInUser(app);

    expect((await joinQuest(app, user, randomUUID())).body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });

  it('is refused for a Quest the User holds, which stays', async () => {
    const user = await signInUser(app);
    const questId = await attendedQuest(user, (await storeEvent(prisma)).id);

    expect((await joinQuest(app, user, questId)).body).toMatchObject(refused(409, 'ALREADY_HOLDER'));
    expect((await getQuest(app, user, questId)).status).toBe(200);
  });
});

describe('Joining a Quest for a Global Event the User holds a Quest for', () => {
  it('deletes the Quest the User held alone, with its Sub Quests and the User’s progress', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const questId = await attendedQuest(leader, event.id);
    const { questId: alone } = await questFor(app, user, event.id);
    const subQuestId = await subQuestIn(app, user, alone);
    await markDone(app, user, { questId: alone, subQuestId });

    const response = await joinQuest(app, user, questId);

    expect(response.status).toBe(201);
    expect((await getQuests(app, user)).body).toMatchObject([{ id: questId }]);
    expect(await prisma.quest.count({ where: { id: alone } })).toBe(0);
    expect(await prisma.subQuest.count({ where: { questId: alone } })).toBe(0);
    expect(await prisma.subQuestProgress.count({ where: { subQuestId } })).toBe(0);
  });

  it('is refused while the User holds a Shared Quest for it, which stays', async () => {
    const [leader, user, other] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const questId = await attendedQuest(leader, event.id);
    const shared = await attendedQuest(other, event.id);
    await joinQuest(app, user, shared);

    const response = await joinQuest(app, user, questId);

    expect(response.body).toMatchObject(refused(409, 'SHARED_QUEST_HELD'));
    expect((await getQuests(app, user)).body).toMatchObject([
      { id: shared, holders: [{ id: other.id }, { id: user.id }] },
    ]);
    expect((await getQuest(app, leader, questId)).body).toMatchObject({ holders: [{ id: leader.id }] });
  });
});

describe('Joining a Quest without a Global Event', () => {
  it('leaves the User’s other Quests as they are', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
    const mine = await ownQuest(app, user);

    expect((await joinQuest(app, user, questId)).status).toBe(201);
    expect((await getQuests(app, user)).body).toMatchObject([{ id: questId }, { id: mine }]);
  });
});
