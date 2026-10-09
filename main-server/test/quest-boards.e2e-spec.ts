// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser, TestUser } from './friends.js';
import {
  changeQuest,
  getInvitations,
  getSentJoinRequests,
  invite,
  joinRequestOf,
  setQuest,
} from './quest-recruiting.js';
import {
  connectToDatabase,
  getQuest,
  getQuests,
  getRecruitingQuests,
  makeQuest,
  ownQuest,
  questFor,
  storeEvent,
} from './quests.js';
import { ANY_STRING, refused } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const subQuest = { title: '저녁', startsAt: '2030-10-13T09:00:00.000Z' };

// The field the first message of a 400 names.
function fieldOf(body: unknown): string | undefined {
  return z
    .object({ message: z.array(z.string()) })
    .parse(body)
    .message[0]?.split(':')[0];
}

describe('Making a Quest with a board and a description', () => {
  it.each(['open', 'approval'])('posts a %s Quest on the board, with the description', async (joinPolicy) => {
    const user = await signInUser(app);

    const response = await makeQuest(app, user, {
      title: '저녁 같이 먹어요',
      subQuest,
      joinPolicy,
      board: 'meal',
      description: '학관에서 저녁 먹을 사람',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      joinPolicy,
      board: 'meal',
      description: '학관에서 저녁 먹을 사람',
      createdAt: ANY_STRING,
    });
    expect((await getQuests(app, user)).body).toEqual([response.body]);
  });

  it('gives a Closed Quest no board and, left out, an empty description', async () => {
    const user = await signInUser(app);

    const response = await makeQuest(app, user, { title: '산책', subQuest });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ joinPolicy: 'closed', board: null, description: '' });
  });

  it('keeps a description on a Closed Quest', async () => {
    const user = await signInUser(app);

    const response = await makeQuest(app, user, { title: '산책', subQuest, description: '천천히 걸어요' });

    expect(response.body).toMatchObject({ board: null, description: '천천히 걸어요' });
  });

  it('takes a description of 200 characters', async () => {
    const user = await signInUser(app);

    const response = await makeQuest(app, user, { title: '산책', subQuest, description: '가'.repeat(200) });

    expect(response.status).toBe(201);
  });
});

describe('Making a Quest is refused', () => {
  it.each([
    ['an Open Quest without a board', { joinPolicy: 'open' }, 'board'],
    ['an Approval Quest without a board', { joinPolicy: 'approval' }, 'board'],
    ['a board for a Closed Quest', { joinPolicy: 'closed', board: 'meal' }, 'board'],
    ['a board without a Join Policy', { board: 'meal' }, 'board'],
    ['an unknown board', { joinPolicy: 'open', board: 'study' }, 'board'],
    ['a description too long', { description: '가'.repeat(201) }, 'description'],
  ])('for %s', async (_case, body, field) => {
    const user = await signInUser(app);

    const response = await makeQuest(app, user, { title: '산책', subQuest, ...body });

    expect(response.status).toBe(400);
    expect(fieldOf(response.body)).toBe(field);
    expect((await getQuests(app, user)).body).toEqual([]);
  });
});

describe('The Leader changing the board and the description', () => {
  it('moves the Quest to another board and rewrites its description', async () => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open', board: 'meal', description: '저녁' });

    const response = await changeQuest(app, leader, questId, { board: 'hobby', description: '보드게임' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ joinPolicy: 'open', board: 'hobby', description: '보드게임' });
  });

  it('keeps the stored board when the Quest stays recruiting', async () => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open', board: 'career' });

    const response = await changeQuest(app, leader, questId, { joinPolicy: 'approval' });

    expect(response.body).toMatchObject({ joinPolicy: 'approval', board: 'career' });
  });

  it('opens a Closed Quest onto the board given', async () => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader);

    const response = await changeQuest(app, leader, questId, { joinPolicy: 'open', board: 'show' });

    expect(response.body).toMatchObject({ joinPolicy: 'open', board: 'show' });
  });
});

describe('The Leader closing a Quest or clearing its description', () => {
  it('clears the board when the Quest is made Closed', async () => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open', board: 'meal', description: '저녁' });

    const response = await changeQuest(app, leader, questId, { joinPolicy: 'closed' });

    expect(response.body).toMatchObject({ joinPolicy: 'closed', board: null, description: '저녁' });
  });

  it('clears the description with an empty one', async () => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader, { description: '천천히 걸어요' });

    const response = await changeQuest(app, leader, questId, { description: '' });

    expect(response.body).toMatchObject({ description: '' });
  });

  it('works for a Quest for a Global Event', async () => {
    const leader = await signInUser(app);
    const { questId } = await questFor(app, leader, (await storeEvent(prisma)).id);

    const response = await changeQuest(app, leader, questId, {
      joinPolicy: 'approval',
      board: 'career',
      description: '설명회 같이 가요',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ joinPolicy: 'approval', board: 'career', description: '설명회 같이 가요' });
  });
});

describe('Changing the board is refused, and nothing is stored,', () => {
  it.each([
    ['for an Open Quest without a board', {}, { joinPolicy: 'open' }, 'BOARD_REQUIRED'],
    ['for an Approval Quest without a board', {}, { joinPolicy: 'approval' }, 'BOARD_REQUIRED'],
    ['for a board on a Closed Quest', {}, { board: 'meal', description: '저녁' }, 'BOARD_FOR_CLOSED_QUEST'],
    [
      'for a board on a Quest made Closed',
      { joinPolicy: 'open', board: 'meal' },
      { joinPolicy: 'closed', board: 'hobby' },
      'BOARD_FOR_CLOSED_QUEST',
    ],
  ])('%s', async (_case, made, changes, code) => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader, made);
    const before: unknown = (await getQuest(app, leader, questId)).body;

    const response = await changeQuest(app, leader, questId, changes);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, code));
    expect((await getQuest(app, leader, questId)).body).toEqual(before);
  });

  it('for a description too long', async () => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader);

    const response = await changeQuest(app, leader, questId, { description: '가'.repeat(201) });

    expect(response.status).toBe(400);
    expect(fieldOf(response.body)).toBe('description');
  });
});

describe('Every answer that holds a Quest', () => {
  const posted = { joinPolicy: 'approval', board: 'meal', description: '학관에서 저녁' };
  const fields = { board: 'meal', description: '학관에서 저녁', createdAt: ANY_STRING };

  it('says its board, its description and when it was made, in the list of recruiting Quests', async () => {
    const [leader, reader] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, posted);

    const listed = z
      .array(z.object({ id: z.string() }).loose())
      .parse((await getRecruitingQuests(app, reader)).body)
      .find(({ id }) => id === questId);

    expect(listed).toMatchObject(fields);
  });

  it('says them in a request to join and in an invitation', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    await befriend(app, leader, user);
    const questId = await ownQuest(app, leader, posted);
    await joinRequestOf(app, user, questId);
    await invite(app, leader, questId, user.id);

    expect((await getSentJoinRequests(app, user)).body).toMatchObject([{ quest: { id: questId, ...fields } }]);
    expect((await getInvitations(app, user)).body).toMatchObject([{ quest: { id: questId, ...fields } }]);
  });

  it('says them in a Quest of a Global Event once changed', async () => {
    const leader = await signInUser(app);
    const { questId } = await questFor(app, leader, (await storeEvent(prisma)).id);
    await setQuest(app, leader, questId, posted);

    expect((await getQuest(app, leader, questId)).body).toMatchObject({ id: questId, ...fields });
  });
});

// The reader's view of these Quests, in the list's order.
async function recruitingIds(
  reader: TestUser,
  questIds: string[],
  globalEventId?: string,
  board?: string,
): Promise<string[]> {
  const response = await getRecruitingQuests(app, reader, globalEventId, board);
  expect(response.status).toBe(200);
  return z
    .array(z.object({ id: z.string() }))
    .parse(response.body)
    .map(({ id }) => id)
    .filter((id) => questIds.includes(id));
}

describe('The list of recruiting Quests of a board', () => {
  it('holds that board’s Quests, the newest first', async () => {
    const [leader, reader] = await Promise.all([signInUser(app), signInUser(app)]);
    const older = await ownQuest(app, leader, { joinPolicy: 'open', board: 'show' });
    const hobby = await ownQuest(app, leader, { joinPolicy: 'open', board: 'hobby' });
    const newer = await ownQuest(app, leader, { joinPolicy: 'approval', board: 'show' });

    expect(await recruitingIds(reader, [older, hobby, newer], undefined, 'show')).toEqual([newer, older]);
    expect(await recruitingIds(reader, [older, hobby, newer])).toEqual([newer, hobby, older]);
  });

  it('works with a Global Event', async () => {
    const [leader, other, reader] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const { questId: career } = await questFor(app, leader, event.id);
    await setQuest(app, leader, career, { joinPolicy: 'open', board: 'career' });
    const { questId: meal } = await questFor(app, other, event.id);
    await setQuest(app, other, meal, { joinPolicy: 'open', board: 'meal' });
    const elsewhere = await ownQuest(app, leader, { joinPolicy: 'open', board: 'career' });

    expect(await recruitingIds(reader, [career, meal, elsewhere], event.id, 'career')).toEqual([career]);
  });

  it('is refused for an unknown board', async () => {
    const reader = await signInUser(app);

    const response = await getRecruitingQuests(app, reader, undefined, 'study');

    expect(response.status).toBe(400);
  });
});
