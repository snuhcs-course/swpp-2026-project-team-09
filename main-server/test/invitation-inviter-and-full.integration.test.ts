/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { getInvitations, handOver, invite } from './quest-recruiting.js';
import { connectToDatabase, joinQuest, ownQuest } from './quests.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';

// Who an invitation names as its sender, and inviting into a full 파티 (P06 ticket 31): the card names the Leader who
// invited, kept past a hand-over, and an invitation into a 파티 full at that moment is refused.

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

// A Leader's Open Quest of two places that `member` entered, and `friend`, a Friend of the Leader outside it.
async function heldWithMember(): Promise<{ leader: TestUser; member: TestUser; friend: TestUser; questId: string }> {
  const [leader, member, friend] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
  await befriend(app, leader, friend);
  const questId = await ownQuest(app, leader, { joinPolicy: 'open', capacity: 3 });
  await joinQuest(app, member, questId).expect(201);
  return { leader, member, friend, questId };
}

describe('An invitation as the invited User lists it', () => {
  it('names the Leader who sent it, also once another Holder leads the Quest', async () => {
    const { leader, member, friend, questId } = await heldWithMember();
    await invite(app, leader, questId, friend.id).expect(204);
    await handOver(app, leader, questId, member.id).expect(204);

    const response = await getInvitations(app, friend);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([{ invitedBy: { id: leader.id }, quest: { leader: { id: member.id } } }]);
  });

  it('names the Quest’s Leader for an invitation sent before the sender was kept', async () => {
    const { leader, member, friend, questId } = await heldWithMember();
    await invite(app, leader, questId, friend.id).expect(204);
    await prisma.questInvitation.updateMany({ where: { questId }, data: { invitedById: null } });
    await handOver(app, leader, questId, member.id).expect(204);

    const response = await getInvitations(app, friend);

    expect(response.body).toMatchObject([{ invitedBy: { id: member.id } }]);
  });
});

describe('Inviting into a 파티', () => {
  it('is refused once its Holders fill it, and leaves no invitation', async () => {
    const [leader, member, friend] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    await befriend(app, leader, friend);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open', capacity: 2 });
    await joinQuest(app, member, questId).expect(201);

    const response = await invite(app, leader, questId, friend.id);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_FULL'));
    expect((await getInvitations(app, friend)).body).toEqual([]);
  });

  it('with places left invites more Friends than the places: 1/8 invites 10', async () => {
    const leader = await signInUser(app);
    const friends = await Promise.all(Array.from({ length: 10 }, () => signInUser(app)));
    await Promise.all(friends.map((friend) => befriend(app, leader, friend)));
    const questId = await ownQuest(app, leader, { capacity: 8 });

    const responses = await Promise.all(friends.map((friend) => invite(app, leader, questId, friend.id)));

    expect(responses.map(({ status }) => status)).toEqual(Array.from({ length: 10 }, () => 204));
  });
});
