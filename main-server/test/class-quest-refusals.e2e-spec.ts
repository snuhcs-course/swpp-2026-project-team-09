import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { openParty } from './parties.js';
import {
  answerJoinRequest,
  askToJoin,
  changeQuest,
  getJoinRequests,
  handOver,
  invite,
  removeHolder,
} from './quest-recruiting.js';
import {
  addSubQuest,
  cancelSubQuest,
  connectToDatabase,
  dropQuest,
  editSubQuest,
  getQuests,
  getRecruitingQuests,
  joinQuest,
  markDone,
  ownQuest,
  storeEvent,
  type SubQuestPath,
} from './quests.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';
import { aClass, addClass, classesOf } from './timetable.js';

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

function setClock(at: string): void {
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date(at));
}

// 09:00 in Asia/Seoul on Tuesday 2026-10-06, a day of the sample class, and on Wednesday, which is not.
const TUESDAY_MORNING = '2026-10-06T00:00:00.000Z';
const WEDNESDAY_MORNING = '2026-10-07T00:00:00.000Z';

// A User with the sample class, held on Tuesday and Thursday, and the class's id with that of its Tuesday time.
async function userWithClass(): Promise<{ user: TestUser; path: SubQuestPath }> {
  const user = await signInUser(app);
  const added = await addClass(app, user.accessToken, aClass(null));
  return { user, path: { questId: added.id, subQuestId: added.times[0]?.id ?? '' } };
}

type Route = (user: TestUser, path: SubQuestPath) => request.Test;

const routes: [string, Route][] = [
  ['dropping it', (user, { questId }) => dropQuest(app, user, questId)],
  ['adding a Sub Quest', (user, { questId }) => addSubQuest(app, user, questId, { title: '카페' })],
  ['editing a Sub Quest', (user, path) => editSubQuest(app, user, path, { title: '카페' })],
  ['cancelling a Sub Quest', (user, path) => cancelSubQuest(app, user, path)],
  ['marking a Sub Quest done', (user, path) => markDone(app, user, path)],
  ['joining it', (user, { questId }) => joinQuest(app, user, questId)],
  ['asking to join it', (user, { questId }) => askToJoin(app, user, questId)],
  ['changing its settings', (user, { questId }) => changeQuest(app, user, questId, { capacity: 2 })],
  ['handing over its Leader', (user, { questId }) => handOver(app, user, questId, randomUUID())],
  ['removing a Holder', (user, { questId }) => removeHolder(app, user, questId, user.id)],
  ['listing its requests to join', (user, { questId }) => getJoinRequests(app, user, questId)],
  [
    'accepting a request to join',
    (user, { questId }) => answerJoinRequest(app, user, { questId, requestId: randomUUID() }, 'accept'),
  ],
  [
    'declining a request to join',
    (user, { questId }) => answerJoinRequest(app, user, { questId, requestId: randomUUID() }, 'decline'),
  ],
  ['inviting into it', (user, { questId }) => invite(app, user, questId, randomUUID())],
];

// What the User reads of the Quests and the timetable, and what is stored under the class's id.
async function stateOf(user: TestUser, questId: string): Promise<unknown> {
  return {
    quests: z.array(z.unknown()).parse((await getQuests(app, user)).body),
    classes: await classesOf(app, user.accessToken),
    stored: await Promise.all([
      prisma.quest.count({ where: { id: questId } }),
      prisma.questJoinRequest.count({ where: { questId } }),
      prisma.questInvitation.count({ where: { questId } }),
    ]),
  };
}

describe.each([
  ['with a time today', TUESDAY_MORNING],
  ['without a time today', WEDNESDAY_MORNING],
])("The User's own class %s", (_, now) => {
  it.each(routes)('refuses %s as a Class Quest and changes nothing', async (_route, route) => {
    const { user, path } = await userWithClass();
    setClock(now);
    const before = await stateOf(user, path.questId);

    const response = await route(user, path);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'CLASS_QUEST'));
    expect(await stateOf(user, path.questId)).toEqual(before);
  });
});

describe("Another User's class", () => {
  it.each(routes)('is answered to %s as a Quest the User does not hold', async (_route, route) => {
    const { path } = await userWithClass();
    const other = await signInUser(app);
    setClock(TUESDAY_MORNING);

    const response = await route(other, path);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });
});

describe('Opening a Party for a Class Quest', () => {
  it('is answered as for an unknown Quest', async () => {
    const { user, path } = await userWithClass();
    setClock(TUESDAY_MORNING);

    const response = await openParty(app, user, { questId: path.questId });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });
});

describe('The list of recruiting Quests', () => {
  it('never holds a Class Quest, for all Global Events or for one', async () => {
    const { user, path } = await userWithClass();
    const openQuestId = await ownQuest(app, user, { joinPolicy: 'open' });
    const globalEvent = await storeEvent(prisma);
    const other = await signInUser(app);
    setClock(TUESDAY_MORNING);

    const ids = async (reader: TestUser, globalEventId?: string): Promise<string[]> =>
      z
        .array(z.object({ id: z.string() }))
        .parse((await getRecruitingQuests(app, reader, globalEventId)).body)
        .map(({ id }) => id);
    const lists = await Promise.all([ids(other), ids(user), ids(other, globalEvent.id)]);

    expect(lists[0]).toContain(openQuestId);
    for (const list of lists) {
      expect(list).not.toContain(path.questId);
    }
  });
});
