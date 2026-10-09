// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-08, prompted by fyoon46
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser, TestUser } from './friends.js';
import {
  answerInvitation,
  answerJoinRequest,
  askToJoin,
  getInvitations,
  getJoinRequests,
  getSentJoinRequests,
  invitationOf,
  joinRequestOf,
  setQuest,
  withdrawJoinRequest,
} from './quest-recruiting.js';
import { connectToDatabase, dropQuest, getQuests, joinQuest, ownQuest, questFor, storeEvent } from './quests.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';

// Entering a Quest by an accepted request or invitation, under the one-Quest rule, and when either ends.

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

interface ForEvent {
  leader: TestUser;
  user: TestUser;
  questId: string;
  // The Quest the User attends the same Global Event with, alone.
  aloneId: string;
}

// The Leader's Quest for a Global Event in the Join Policy given, and a User who attends the event alone and is the
// Leader's Friend.
async function forEvent(joinPolicy: string): Promise<ForEvent> {
  const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
  await befriend(app, leader, user);
  const event = await storeEvent(prisma);
  const { questId } = await questFor(app, leader, event.id);
  await setQuest(app, leader, questId, { joinPolicy, ...(joinPolicy === 'closed' ? {} : { board: 'hobby' }) });
  const { questId: aloneId } = await questFor(app, user, event.id);
  return { leader, user, questId, aloneId };
}

// Another User joins the User's Quest, which makes it a Shared Quest.
async function share(user: TestUser, questId: string): Promise<void> {
  await setQuest(app, user, questId, { joinPolicy: 'open', board: 'hobby' });
  await joinQuest(app, await signInUser(app), questId);
}

describe('A Quest held alone for the Global Event', () => {
  it('is replaced when the User’s request is accepted', async () => {
    const { leader, user, questId, aloneId } = await forEvent('approval');
    const requestId = await joinRequestOf(app, user, questId);

    expect((await answerJoinRequest(app, leader, { questId, requestId }, 'accept')).status).toBe(204);

    expect((await getQuests(app, user)).body).toMatchObject([{ id: questId }]);
    expect(await prisma.quest.findUnique({ where: { id: aloneId } })).toBeNull();
  });

  it('is replaced when the User accepts an invitation', async () => {
    const { leader, user, questId, aloneId } = await forEvent('closed');
    const invitationId = await invitationOf(app, leader, questId, user);

    expect((await answerInvitation(app, user, invitationId, 'accept')).status).toBe(201);

    expect((await getQuests(app, user)).body).toMatchObject([{ id: questId }]);
    expect(await prisma.quest.findUnique({ where: { id: aloneId } })).toBeNull();
  });
});

describe('A Shared Quest for the Global Event', () => {
  it('refuses the User’s request', async () => {
    const { user, questId, aloneId } = await forEvent('approval');
    await share(user, aloneId);

    const response = await askToJoin(app, user, questId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'SHARED_QUEST_HELD'));
  });

  it('refuses accepting a request made before the User held it', async () => {
    const { leader, user, questId, aloneId } = await forEvent('approval');
    const requestId = await joinRequestOf(app, user, questId);
    await share(user, aloneId);

    const response = await answerJoinRequest(app, leader, { questId, requestId }, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'SHARED_QUEST_HELD'));
    expect((await getQuests(app, user)).body).toMatchObject([{ id: aloneId }]);
  });

  it('refuses accepting an invitation, which still waits', async () => {
    const { leader, user, questId, aloneId } = await forEvent('closed');
    const invitationId = await invitationOf(app, leader, questId, user);
    await share(user, aloneId);

    const response = await answerInvitation(app, user, invitationId, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'SHARED_QUEST_HELD'));
    expect((await getInvitations(app, user)).body).toHaveLength(1);
  });
});

// A User with a request to join the Leader's Quest and an invitation into it.
async function waiting(): Promise<{
  leader: TestUser;
  user: TestUser;
  questId: string;
  requestId: string;
  invitationId: string;
}> {
  const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
  await befriend(app, leader, user);
  const questId = await ownQuest(app, leader, { joinPolicy: 'approval' });
  const requestId = await joinRequestOf(app, user, questId);
  return { leader, user, questId, requestId, invitationId: await invitationOf(app, leader, questId, user) };
}

async function expectNoneWaiting(user: TestUser): Promise<void> {
  expect((await getSentJoinRequests(app, user)).body).toEqual([]);
  expect((await getInvitations(app, user)).body).toEqual([]);
}

describe('A request and an invitation', () => {
  it('end with the Quest', async () => {
    const { leader, user, questId, requestId } = await waiting();

    await dropQuest(app, leader, questId);

    await expectNoneWaiting(user);
    expect((await withdrawJoinRequest(app, user, requestId)).status).toBe(404);
  });

  it('both end when the User accepts the invitation', async () => {
    const { leader, user, questId, invitationId } = await waiting();

    await answerInvitation(app, user, invitationId, 'accept');

    await expectNoneWaiting(user);
    expect((await getJoinRequests(app, leader, questId)).body).toEqual([]);
  });

  it('both end when the Leader accepts the request', async () => {
    const { leader, user, questId, requestId } = await waiting();

    await answerJoinRequest(app, leader, { questId, requestId }, 'accept');

    await expectNoneWaiting(user);
  });

  it('both end when the User joins the Quest once it is Open', async () => {
    const { leader, user, questId } = await waiting();
    await setQuest(app, leader, questId, { joinPolicy: 'open', board: 'hobby' });

    await joinQuest(app, user, questId);

    await expectNoneWaiting(user);
  });

  it('into other Quests stay when the User enters one', async () => {
    const { leader, user, questId } = await waiting();
    const other = await ownQuest(app, leader, { joinPolicy: 'open' });

    await joinQuest(app, user, other);

    expect((await getSentJoinRequests(app, user)).body).toMatchObject([{ quest: { id: questId } }]);
    expect((await getInvitations(app, user)).body).toMatchObject([{ quest: { id: questId } }]);
  });
});
