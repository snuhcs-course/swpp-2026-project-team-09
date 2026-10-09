// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-08, prompted by fyoon46, reviewed by TaeHyun79 in #41
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser } from './friends.js';
import { overlapOnLock } from './overlap.js';
import { answerInvitation, answerJoinRequest, invitationOf, joinRequestOf } from './quest-recruiting.js';
import { connectToDatabase, getQuest, getQuests, joinQuest, ownQuest, questFor, storeEvent } from './quests.js';
import { refused } from './signals.js';
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

describe('Two Users joining the last free place at the same moment', () => {
  it('leave one of them a Holder', async () => {
    const [leader, first, second] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open', capacity: 2 });

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM quests WHERE id = ${questId}::uuid FOR UPDATE`,
      () => joinQuest(app, first, questId),
      () => joinQuest(app, second, questId),
    );

    expect(answers[0].status).toBe(201);
    expect(answers[1].body).toMatchObject(refused(409, 'QUEST_FULL'));
    expect((await getQuest(app, leader, questId)).body).toMatchObject({
      holders: [{ id: leader.id }, { id: first.id }],
    });
  });
});

describe('A request and an invitation accepted for the last free place at the same moment', () => {
  it('leave one of their Users a Holder', async () => {
    const [leader, asking, invited] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, leader, invited);
    const questId = await ownQuest(app, leader, { joinPolicy: 'approval', capacity: 2 });
    const requestId = await joinRequestOf(app, asking, questId);
    const invitationId = await invitationOf(app, leader, questId, invited);

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM quests WHERE id = ${questId}::uuid FOR UPDATE`,
      () => answerJoinRequest(app, leader, { questId, requestId }, 'accept'),
      () => answerInvitation(app, invited, invitationId, 'accept'),
    );

    expect(answers[0].status).toBe(204);
    expect(answers[1].body).toMatchObject(refused(409, 'QUEST_FULL'));
    expect((await getQuest(app, leader, questId)).body).toMatchObject({
      holders: [{ id: leader.id }, { id: asking.id }],
    });
  });
});

describe('One User joining two Quests of one Global Event at the same moment', () => {
  it('leaves the User a Holder of one of them', async () => {
    const [user, first, second] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    const questIds = await Promise.all(
      [first, second].map(async (leader) => {
        const { questId } = await questFor(app, leader, event.id);
        await prisma.quest.update({ where: { id: questId }, data: { joinPolicy: 'open', board: 'hobby' } });
        return questId;
      }),
    );

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM users WHERE id = ${user.id}::uuid FOR UPDATE`,
      () => joinQuest(app, user, questIds[0] ?? ''),
      () => joinQuest(app, user, questIds[1] ?? ''),
    );

    expect(answers[0].status).toBe(201);
    expect(answers[1].body).toMatchObject(refused(409, 'SHARED_QUEST_HELD'));
    expect((await getQuests(app, user)).body).toMatchObject([{ id: questIds[0] }]);
  });
});
