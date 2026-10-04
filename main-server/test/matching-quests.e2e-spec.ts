import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import { postAsMatchServer } from './match-server.js';
import {
  connectToDatabase,
  getQuest,
  getQuests,
  markDone,
  questFor,
  storeEvent,
  storeSharedQuest,
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
  await watcher.stop();
  await prisma.$disconnect();
  await app.close();
});

const answerSchema = z.object({ questId: z.string(), holderIds: z.array(z.string()) });

function askForQuest(matchId: string, globalEvent: Pick<GlobalEvent, 'id'>, users: TestUser[]): request.Test {
  return postAsMatchServer(app, `/matches/${matchId}/quest`, {
    globalEventId: globalEvent.id,
    userIds: users.map(({ id }) => id),
  });
}

// Asks for the match's Quest and answers it, with its Holders in id order.
async function questOf(
  matchId: string,
  globalEvent: Pick<GlobalEvent, 'id'>,
  users: TestUser[],
): Promise<z.infer<typeof answerSchema>> {
  const response = await askForQuest(matchId, globalEvent, users);
  if (response.status !== 201) {
    throw new Error(`Asking for the Quest answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const { questId, holderIds } = answerSchema.parse(response.body);
  return { questId, holderIds: holderIds.toSorted() };
}

function idsOf(users: TestUser[]): string[] {
  return users.map(({ id }) => id).toSorted();
}

const questListSchema = z.array(z.object({ id: z.string() }));

async function questIdsOf(user: TestUser): Promise<string[]> {
  return questListSchema.parse((await getQuests(app, user)).body).map(({ id }) => id);
}

describe("A match's Shared Quest", () => {
  it('is created for the Global Event, held by the matched Users, with the Sub Quest for attending', async () => {
    const users = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);

    const response = await askForQuest(randomUUID(), event, users);

    expect(response.status).toBe(201);
    const { questId, holderIds } = answerSchema.parse(response.body);
    expect(holderIds.toSorted()).toEqual(idsOf(users));
    const quest = await getQuest(app, users[0], questId);
    expect(quest.body).toMatchObject({
      id: questId,
      title: event.title,
      globalEvent: { id: event.id, title: event.title },
      subQuests: [{ attending: true, title: event.title }],
    });
    const { holders } = z.object({ holders: z.array(z.object({ id: z.string() })) }).parse(quest.body);
    expect(holders.map(({ id }) => id).toSorted()).toEqual(idsOf(users));
    for (const user of users) {
      // oxlint-disable-next-line no-await-in-loop -- one User after another
      expect(await questIdsOf(user)).toEqual([questId]);
    }
  });
});

describe("A repeated request for a match's Shared Quest", () => {
  it('is answered the Quest created the first time', async () => {
    const users = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const matchId = randomUUID();
    const first = await questOf(matchId, event, users);

    const repeat = await questOf(matchId, event, users);

    expect(repeat).toEqual(first);
    expect(await prisma.quest.count({ where: { globalEventId: event.id } })).toBe(1);
  });

  it('creates one Quest when it arrives at the same moment as the first', async () => {
    const users = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const matchId = randomUUID();

    const answers = await Promise.all([questOf(matchId, event, users), questOf(matchId, event, users)]);

    expect(answers[1]).toEqual(answers[0]);
    expect(await prisma.quest.count({ where: { globalEventId: event.id } })).toBe(1);
  });

  it('is answered the Quest after the Global Event has started', async () => {
    const users = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const matchId = randomUUID();
    const first = await questOf(matchId, event, users);
    await prisma.globalEvent.update({ where: { id: event.id }, data: { startsAt: new Date(Date.now() - 1000) } });

    expect(await questOf(matchId, event, users)).toEqual(first);
  });
});

describe("A match's Shared Quest and the Quests the matched Users held", () => {
  it('takes the place of a Quest a matched User held alone, with its Sub Quests and the progress', async () => {
    const [alone, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const { questId: heldAlone } = await questFor(app, alone, event.id);
    const added = await subQuestIn(app, alone, heldAlone);
    await markDone(app, alone, { questId: heldAlone, subQuestId: added });

    const { questId, holderIds } = await questOf(randomUUID(), event, [alone, other]);

    expect(holderIds).toEqual(idsOf([alone, other]));
    expect(await questIdsOf(alone)).toEqual([questId]);
    expect((await getQuest(app, alone, heldAlone)).body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    expect(await prisma.subQuest.count({ where: { questId: heldAlone } })).toBe(0);
    expect(await prisma.subQuestProgress.count({ where: { subQuestId: added } })).toBe(0);
  });

  it('leaves out a matched User who holds a Shared Quest for the Global Event, who keeps that one', async () => {
    const [sharing, partner, first, second] = await Promise.all([1, 2, 3, 4].map(() => signInUser(app)));
    const event = await storeEvent(prisma);
    const shared = await storeSharedQuest(prisma, event, [sharing.id, partner.id]);

    const { questId, holderIds } = await questOf(randomUUID(), event, [sharing, first, second]);

    expect(holderIds).toEqual(idsOf([first, second]));
    expect(await questIdsOf(sharing)).toEqual([shared]);
    expect(await questIdsOf(first)).toEqual([questId]);
  });
});

describe("A match's Shared Quest that cannot be created", () => {
  it('is refused when fewer than two matched Users are free, and leaves the Quests as they were', async () => {
    const [sharing, partner, alone] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const shared = await storeSharedQuest(prisma, event, [sharing.id, partner.id]);
    const { questId: heldAlone } = await questFor(app, alone, event.id);

    const response = await askForQuest(randomUUID(), event, [sharing, alone]);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'MATCH_TOO_SMALL'));
    expect(await questIdsOf(sharing)).toEqual([shared]);
    expect(await questIdsOf(alone)).toEqual([heldAlone]);
  });

  it.each([
    ['has started', { startsAt: new Date(Date.now() - 60 * 60 * 1000) }, 409, 'GLOBAL_EVENT_STARTED'],
    ['was cancelled', { state: 'cancelled' as const }, 404, 'GLOBAL_EVENT_NOT_FOUND'],
  ])('is refused when the Global Event %s, and nothing is created', async (_, changes, status, code) => {
    const users = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const { questId: heldAlone } = await questFor(app, users[0], event.id);
    await prisma.globalEvent.update({ where: { id: event.id }, data: changes });

    const response = await askForQuest(randomUUID(), event, users);

    expect(response.status).toBe(status);
    expect(response.body).toMatchObject(refused(status, code));
    expect(await prisma.quest.findMany({ where: { globalEventId: event.id }, select: { id: true } })).toEqual([
      { id: heldAlone },
    ]);
  });

  it.each([
    ['one User', (user: TestUser): string[] => [user.id]],
    ['a User twice', (user: TestUser): string[] => [user.id, user.id]],
  ])('is refused for %s', async (_, userIds) => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);

    const response = await postAsMatchServer(app, `/matches/${randomUUID()}/quest`, {
      globalEventId: event.id,
      userIds: userIds(user),
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: [expect.stringMatching(/^userIds: /u)] });
  });
});

// The names of the signals that went to the User, in order.
function signalsTo(user: TestUser): string[] {
  return watcher.for(user).map(({ name }) => name);
}

describe('The signals of a Shared Quest from a match', () => {
  it('go to its Holders once, the one whose Quest held alone it replaced included', async () => {
    const [alone, other, sharing, partner] = await Promise.all([1, 2, 3, 4].map(() => signInUser(app)));
    const event = await storeEvent(prisma);
    await questFor(app, alone, event.id);
    await storeSharedQuest(prisma, event, [sharing.id, partner.id]);
    const matchId = randomUUID();

    await questOf(matchId, event, [alone, other, sharing]);
    await questOf(matchId, event, [alone, other, sharing]);

    await vi.waitFor(() => {
      // Attending sent the first to the User who held the Quest alone.
      expect(signalsTo(alone)).toEqual(['quests-changed', 'matching-changed', 'quests-changed']);
      expect(signalsTo(other)).toEqual(['matching-changed', 'quests-changed']);
    });
    expect(signalsTo(sharing)).toEqual([]);
  });
});
