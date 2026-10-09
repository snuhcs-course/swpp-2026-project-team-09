import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import { changeQuest, setQuest } from './quest-recruiting.js';
import {
  connectToDatabase,
  getQuest,
  getRecruitingQuests,
  joinQuest,
  ownQuest,
  questFor,
  storeEvent,
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

function signalsTo(user: TestUser): number {
  return watcher.for(user).filter(({ name }) => name === 'quests-changed').length;
}

// An Open Quest of the Leader that the Holder joined.
async function sharedQuest(leader: TestUser, holder: TestUser, body: object = {}): Promise<string> {
  const questId = await ownQuest(app, leader, { joinPolicy: 'open', ...body });
  await joinQuest(app, holder, questId);
  return questId;
}

describe('The Leader changing the settings', () => {
  it('changes the title, the capacity and the Join Policy, and tells every Holder', async () => {
    const [leader, holder] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await sharedQuest(leader, holder);

    const response = await changeQuest(app, leader, questId, { title: '저녁 같이', capacity: 2, joinPolicy: 'closed' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: questId, title: '저녁 같이', capacity: 2, joinPolicy: 'closed' });
    expect((await getQuest(app, holder, questId)).body).toMatchObject({ title: '저녁 같이', capacity: 2 });
    await vi.waitFor(() => {
      // The entry and the change.
      expect(signalsTo(holder)).toBe(2);
    });
  });

  it('leaves what is left out as it was', async () => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader, { title: '점심 같이', capacity: 3, joinPolicy: 'approval' });

    const response = await changeQuest(app, leader, questId, { capacity: 5 });

    expect(response.body).toMatchObject({ title: '점심 같이', capacity: 5, joinPolicy: 'approval' });
  });

  it('opens a Quest from attending a Global Event to others, who then join it', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, leader, event.id);
    expect((await joinQuest(app, user, questId)).body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));

    await setQuest(app, leader, questId, { joinPolicy: 'open', board: 'hobby' });

    expect((await getRecruitingQuests(app, user, event.id)).body).toMatchObject([{ id: questId }]);
    expect((await joinQuest(app, user, questId)).status).toBe(201);
  });
});

describe('The Leader of a Quest with a Global Event', () => {
  it('changes its title, which still names the event', async () => {
    const leader = await signInUser(app);
    const { questId } = await questFor(app, leader, (await storeEvent(prisma)).id);

    const response = await changeQuest(app, leader, questId, { title: '내 설명회' });

    expect(response.status).toBe(200);
    expect((await getQuest(app, leader, questId)).body).toMatchObject({
      title: '내 설명회',
      globalEvent: { title: '지능형통신 연합전공 설명회' },
      subQuests: [{ attending: true, title: '지능형통신 연합전공 설명회' }],
    });
  });
});

describe('Changing the settings is refused', () => {
  it('for a capacity below the number of Holders', async () => {
    const [leader, first, second] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const questId = await sharedQuest(leader, first);
    await joinQuest(app, second, questId);

    const response = await changeQuest(app, leader, questId, { capacity: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'CAPACITY_BELOW_HOLDERS'));
    expect((await changeQuest(app, leader, questId, { capacity: 3 })).status).toBe(200);
  });

  it.each([{ capacity: 0 }, { capacity: 9 }, { title: '' }, { joinPolicy: 'secret' }, { leaderId: randomUUID() }])(
    'for %o',
    async (changes) => {
      const leader = await signInUser(app);
      const questId = await ownQuest(app, leader);

      expect((await changeQuest(app, leader, questId, changes)).status).toBe(400);
    },
  );
});

describe('The Leader’s part of the settings', () => {
  it('is refused to another Holder', async () => {
    const [leader, holder] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await sharedQuest(leader, holder);

    const response = await changeQuest(app, holder, questId, { title: '내 퀘스트' });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject(refused(403, 'NOT_QUEST_LEADER'));
  });

  it('is refused to a User who does not hold the Quest', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });

    const response = await changeQuest(app, user, questId, { title: '내 퀘스트' });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });
});
