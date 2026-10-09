/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { overlapOnLock } from './overlap.js';
import {
  answerInvitation,
  cancelInvitation,
  getInvitations,
  getSentInvitations,
  invitationOf,
} from './quest-recruiting.js';
import { connectToDatabase, getQuest, joinQuest, ownQuest } from './quests.js';
import { ANY_STRING, refused, SignalWatcher } from './signals.js';
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

// A Leader and Friends of theirs.
async function leaderWithFriends(count: number): Promise<[TestUser, ...TestUser[]]> {
  const leader = await signInUser(app);
  const friends = await Promise.all(
    Array.from({ length: count }, async () => {
      const friend = await signInUser(app);
      await befriend(app, leader, friend);
      return friend;
    }),
  );
  return [leader, ...friends];
}

// A Quest of the Leader, with an invitation of the Friend into it.
async function invited(leader: TestUser, friend: TestUser): Promise<{ questId: string; invitationId: string }> {
  const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
  return { questId, invitationId: await invitationOf(app, leader, questId, friend) };
}

describe('The Leader’s list of invitations', () => {
  it('has the waiting invitations with who was invited, the newest first', async () => {
    const leader = await signInUser(app);
    const first = await signInUser(app, { name: '김철수', department: '경영학과' });
    const second = await signInUser(app, { name: '이영희', department: '물리학과' });
    await befriend(app, leader, first);
    await befriend(app, leader, second);
    const questId = await ownQuest(app, leader);
    const firstId = await invitationOf(app, leader, questId, first);
    const secondId = await invitationOf(app, leader, questId, second);

    const response = await getSentInvitations(app, leader, questId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: secondId, user: { id: second.id, name: '이영희', department: '물리학과' }, sentAt: ANY_STRING },
      { id: firstId, user: { id: first.id, name: '김철수', department: '경영학과' }, sentAt: ANY_STRING },
    ]);
  });

  it('leaves out an invitation once it is answered', async () => {
    const [leader, accepting, declining] = await leaderWithFriends(2);
    const questId = await ownQuest(app, leader);
    const accepted = await invitationOf(app, leader, questId, accepting);
    const declined = await invitationOf(app, leader, questId, declining);
    await answerInvitation(app, accepting, accepted, 'accept');
    await answerInvitation(app, declining, declined, 'decline');

    expect((await getSentInvitations(app, leader, questId)).body).toEqual([]);
  });
});

describe('The Leader cancelling an invitation', () => {
  it('ends it, and tells the invited User', async () => {
    const [leader, friend] = await leaderWithFriends(1);
    const { questId, invitationId } = await invited(leader, friend);

    const response = await cancelInvitation(app, leader, questId, invitationId);

    expect(response.status).toBe(204);
    expect((await getSentInvitations(app, leader, questId)).body).toEqual([]);
    expect((await getInvitations(app, friend)).body).toEqual([]);
    await vi.waitFor(() => {
      // The invitation and its cancel.
      expect(signalsTo(friend)).toBe(2);
    });
    expect((await answerInvitation(app, friend, invitationId, 'accept')).body).toMatchObject(
      refused(404, 'QUEST_INVITATION_NOT_FOUND'),
    );
  });

  it('is refused for an invitation no longer waiting: cancelled, accepted, or of another Quest', async () => {
    const [leader, cancelled, accepting, other] = await leaderWithFriends(3);
    const { questId, invitationId } = await invited(leader, cancelled);
    await cancelInvitation(app, leader, questId, invitationId);
    const acceptedId = await invitationOf(app, leader, questId, accepting);
    await answerInvitation(app, accepting, acceptedId, 'accept');
    const { invitationId: otherId } = await invited(leader, other);

    const responses = await Promise.all(
      [invitationId, acceptedId, otherId, randomUUID()].map((id) => cancelInvitation(app, leader, questId, id)),
    );

    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject(refused(404, 'QUEST_INVITATION_NOT_FOUND'));
    }
  });
});

describe('The invited User declining', () => {
  it('tells the Leader, whose list drops the invitation', async () => {
    const [leader, friend] = await leaderWithFriends(1);
    const { invitationId } = await invited(leader, friend);

    await answerInvitation(app, friend, invitationId, 'decline');

    await vi.waitFor(() => {
      // Making the Quest and the decline.
      expect(signalsTo(leader)).toBe(2);
    });
  });
});

describe('The Leader’s list and cancel', () => {
  it('are refused to another Holder', async () => {
    const [leader, holder, friend] = await leaderWithFriends(2);
    const { questId, invitationId } = await invited(leader, friend);
    await joinQuest(app, holder, questId);

    const responses = await Promise.all([
      getSentInvitations(app, holder, questId),
      cancelInvitation(app, holder, questId, invitationId),
    ]);

    for (const response of responses) {
      expect(response.body).toMatchObject(refused(403, 'NOT_QUEST_LEADER'));
    }
    expect((await getInvitations(app, friend)).body).toHaveLength(1);
  });

  it('are refused to a User who does not hold the Quest', async () => {
    const [leader, friend] = await leaderWithFriends(1);
    const { questId, invitationId } = await invited(leader, friend);

    const responses = await Promise.all([
      getSentInvitations(app, friend, questId),
      cancelInvitation(app, friend, questId, invitationId),
    ]);

    for (const response of responses) {
      expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
    }
  });
});

describe('An acceptance and a cancel of one invitation at the same moment', () => {
  it('leave the invitation cancelled and the User no Holder when the cancel runs first', async () => {
    const [leader, friend] = await leaderWithFriends(1);
    const { questId, invitationId } = await invited(leader, friend);

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM quests WHERE id = ${questId}::uuid FOR UPDATE`,
      () => cancelInvitation(app, leader, questId, invitationId),
      () => answerInvitation(app, friend, invitationId, 'accept'),
    );

    expect(answers[0].status).toBe(204);
    expect(answers[1].body).toMatchObject(refused(404, 'QUEST_INVITATION_NOT_FOUND'));
    expect((await getQuest(app, leader, questId)).body).toMatchObject({ holders: [{ id: leader.id }] });
  });

  it('leave the User a Holder and refuse the cancel when the acceptance runs first', async () => {
    const [leader, friend] = await leaderWithFriends(1);
    const { questId, invitationId } = await invited(leader, friend);

    const answers = await overlapOnLock(
      prisma,
      (tx) => tx.$queryRaw`SELECT 1 FROM quests WHERE id = ${questId}::uuid FOR UPDATE`,
      () => answerInvitation(app, friend, invitationId, 'accept'),
      () => cancelInvitation(app, leader, questId, invitationId),
    );

    expect(answers[0].status).toBe(201);
    expect(answers[1].body).toMatchObject(refused(404, 'QUEST_INVITATION_NOT_FOUND'));
    expect((await getQuest(app, leader, questId)).body).toMatchObject({
      holders: [{ id: leader.id }, { id: friend.id }],
    });
  });
});
