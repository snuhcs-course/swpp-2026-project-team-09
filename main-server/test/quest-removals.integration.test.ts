/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser, TestUser } from './friends.js';
import {
  answerJoinRequest,
  askToJoin,
  changeQuest,
  getJoinRequests,
  getQuestRemovals,
  joinRequestOf,
  removeHolder,
} from './quest-recruiting.js';
import { dropQuest, joinQuest, ownQuest } from './quests.js';
import { ANY_STRING, refused } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

async function setJoinPolicy(leader: TestUser, questId: string, joinPolicy: 'open' | 'approval'): Promise<void> {
  const response = await changeQuest(app, leader, questId, { joinPolicy });
  if (response.status !== 200) {
    throw new Error(`Changing the Quest answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}

// A Quest of the Leader, with this Join Policy, that the User joined while it was Open and the Leader removed the User
// from.
async function removedFrom(
  leader: TestUser,
  user: TestUser,
  joinPolicy: 'open' | 'approval' = 'open',
): Promise<string> {
  const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
  await joinQuest(app, user, questId);
  if (joinPolicy === 'approval') {
    await setJoinPolicy(leader, questId, joinPolicy);
  }
  const response = await removeHolder(app, leader, questId, user.id);
  if (response.status !== 204) {
    throw new Error(`Removing answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return questId;
}

describe('The Leader removing a Holder', () => {
  it('keeps the removal, which the User lists', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await removedFrom(leader, user);

    expect((await getQuestRemovals(app, user)).body).toEqual([{ questId, removedAt: ANY_STRING }]);
  });
});

describe('A Holder leaving', () => {
  it('keeps no removal, so the User may join again at once', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
    await joinQuest(app, user, questId);

    await dropQuest(app, user, questId);

    expect((await getQuestRemovals(app, user)).body).toEqual([]);
    expect((await joinQuest(app, user, questId)).status).toBe(201);
  });

  it('leaves an Open Quest that takes no request from the User', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
    await joinQuest(app, user, questId);
    await dropQuest(app, user, questId);

    const response = await askToJoin(app, user, questId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_NOT_APPROVAL'));
  });
});

describe('A removed User joining', () => {
  it('is refused for the Open Quest, and told to ask', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await removedFrom(leader, user);

    const response = await joinQuest(app, user, questId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_REMOVED_ASK'));
  });
});

describe('A removed User asking to join', () => {
  it('is taken by the Open Quest, and the Leader sees the request marked', async () => {
    const leader = await signInUser(app);
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });
    const other = await signInUser(app, { name: '이영희', department: '물리학과' });
    const questId = await removedFrom(leader, user);
    // A request of another User, from while the Quest was Approval, waits beside it.
    await setJoinPolicy(leader, questId, 'approval');
    await joinRequestOf(app, other, questId);
    await setJoinPolicy(leader, questId, 'open');

    const response = await askToJoin(app, user, questId);

    expect(response.status).toBe(201);
    expect((await getJoinRequests(app, leader, questId)).body).toEqual([
      {
        id: ANY_STRING,
        user: { id: user.id, name: '김철수', department: '경영학과' },
        sentAt: ANY_STRING,
        removedBefore: true,
      },
      {
        id: ANY_STRING,
        user: { id: other.id, name: '이영희', department: '물리학과' },
        sentAt: ANY_STRING,
        removedBefore: false,
      },
    ]);
  });

  it('is taken by an Approval Quest as before, marked for the Leader', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await removedFrom(leader, user, 'approval');

    expect((await askToJoin(app, user, questId)).status).toBe(201);
    expect((await getJoinRequests(app, leader, questId)).body).toMatchObject([{ removedBefore: true }]);
  });
});

describe('The Leader answering a removed User', () => {
  it('by accepting makes them a Holder again, without the removal', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await removedFrom(leader, user);
    const requestId = await joinRequestOf(app, user, questId);

    expect((await answerJoinRequest(app, leader, { questId, requestId }, 'accept')).status).toBe(204);

    expect((await getQuestRemovals(app, user)).body).toEqual([]);
    await dropQuest(app, user, questId);
    expect((await joinQuest(app, user, questId)).status).toBe(201);
  });

  it('by declining leaves them removed', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await removedFrom(leader, user);
    const requestId = await joinRequestOf(app, user, questId);

    await answerJoinRequest(app, leader, { questId, requestId }, 'decline');

    expect((await getQuestRemovals(app, user)).body).toEqual([{ questId, removedAt: ANY_STRING }]);
    expect((await joinQuest(app, user, questId)).body).toMatchObject(refused(409, 'QUEST_REMOVED_ASK'));
  });
});
