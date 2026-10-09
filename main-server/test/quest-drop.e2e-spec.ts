// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #41
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import {
  attend,
  cancelSubQuest,
  connectToDatabase,
  dropQuest,
  editSubQuest,
  getQuest,
  getQuests,
  markDone,
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

// A Quest for a new Global Event held by both Users, as a match gives, with a Sub Quest the first added and marked
// done.
async function sharedQuest(
  user: TestUser,
  other: TestUser,
): Promise<{ questId: string; subQuestId: string; globalEventId: string }> {
  const event = await storeEvent(prisma);
  const { questId } = await questFor(app, user, event.id);
  await prisma.questHolder.create({ data: { questId, userId: other.id, globalEventId: event.id } });
  const subQuestId = await subQuestIn(app, user, questId);
  await markDone(app, user, { questId, subQuestId });
  return { questId, subQuestId, globalEventId: event.id };
}

describe('Dropping a Quest', () => {
  it('deletes the Quest with its Sub Quests when the last Holder drops it', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, user, event.id);
    const subQuestId = await subQuestIn(app, user, questId);
    await markDone(app, user, { questId, subQuestId });

    const response = await dropQuest(app, user, questId);

    expect(response.status).toBe(204);
    expect((await getQuests(app, user)).body).toEqual([]);
    expect((await getQuest(app, user, questId)).body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    expect(await prisma.quest.count({ where: { id: questId } })).toBe(0);
    expect(await prisma.subQuest.count({ where: { questId } })).toBe(0);
    expect(await prisma.subQuestProgress.count({ where: { subQuestId } })).toBe(0);
  });

  it('lets the User attend the Global Event again, which gives a new Quest', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    const { questId } = await questFor(app, user, event.id);
    await dropQuest(app, user, questId);

    const again = await attend(app, user, event.id);

    expect(again.status).toBe(201);
    expect(again.body).not.toMatchObject({ id: questId });
  });

  it('removes only the Holder and the Holder’s progress while others hold it', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId, subQuestId } = await sharedQuest(user, other);

    await dropQuest(app, user, questId);

    expect((await getQuest(app, user, questId)).body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    expect((await getQuest(app, other, questId)).body).toMatchObject({
      holders: [{ id: other.id }],
      subQuests: [{ attending: true }, { id: subQuestId, done: false }],
    });
    expect(await prisma.subQuestProgress.count({ where: { subQuestId } })).toBe(0);
  });
});

describe('Dropping a Quest that is not held', () => {
  it('is refused to a User who is not a Holder', async () => {
    const [user, stranger] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId } = await questFor(app, user, (await storeEvent(prisma)).id);

    const response = await dropQuest(app, stranger, questId);

    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    expect((await getQuest(app, user, questId)).status).toBe(200);
  });
});

describe('The one Quest for a Global Event', () => {
  it('is enforced by the database', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    await questFor(app, user, event.id);
    const second = await prisma.quest.create({
      data: { title: event.title, globalEventId: event.id, leaderId: user.id },
    });

    await expect(
      prisma.questHolder.create({ data: { questId: second.id, userId: user.id, globalEventId: event.id } }),
    ).rejects.toThrow(/Unique constraint/u);
  });
});

// The names of the signals that went to the User, in order.
function signalsTo(user: TestUser): string[] {
  return watcher.for(user).map(({ name }) => name);
}

describe('quests-changed', () => {
  it('goes to the User who attends, once', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);

    await attend(app, user, event.id);
    await attend(app, user, event.id);

    await vi.waitFor(() => {
      expect(signalsTo(user)).toEqual(['quests-changed']);
    });
  });

  it('goes to every Holder when a Sub Quest is added, edited or cancelled, and when a Holder drops the Quest', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId, subQuestId } = await sharedQuest(user, other);

    await editSubQuest(app, other, { questId, subQuestId }, { title: '저녁' });
    await cancelSubQuest(app, other, { questId, subQuestId });
    await dropQuest(app, other, questId);

    // Attending, adding, editing, cancelling and dropping for the User; the last four for the other Holder.
    await vi.waitFor(() => {
      expect(signalsTo(user)).toHaveLength(5);
      expect(signalsTo(other)).toHaveLength(4);
    });
    expect(new Set([...signalsTo(user), ...signalsTo(other)])).toEqual(new Set(['quests-changed']));
  });
});
