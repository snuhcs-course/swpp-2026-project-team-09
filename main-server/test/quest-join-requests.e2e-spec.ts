/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser, TestUser } from './friends.js';
import {
  answerJoinRequest,
  askToJoin,
  getJoinRequests,
  getSentJoinRequests,
  joinRequestOf,
  setQuest,
  withdrawJoinRequest,
} from './quest-recruiting.js';
import { getQuest, getQuests, joinQuest, ownQuest } from './quests.js';
import { ANY_STRING, refused, SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

function signalsTo(user: TestUser): number {
  return watcher.for(user).filter(({ name }) => name === 'quests-changed').length;
}

// An Approval Quest of the Leader, with a request to join from the User.
async function asked(
  leader: TestUser,
  user: TestUser,
  body: object = {},
): Promise<{ questId: string; requestId: string }> {
  const questId = await ownQuest(app, leader, { joinPolicy: 'approval', ...body });
  return { questId, requestId: await joinRequestOf(app, user, questId) };
}

describe('Asking to join an Approval Quest', () => {
  it('leaves a request that waits, which the Leader lists with who asked, and tells the Leader', async () => {
    const leader = await signInUser(app, { name: '홍길동', department: '컴퓨터공학부' });
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });
    const questId = await ownQuest(app, leader, { title: '점심 같이', joinPolicy: 'approval' });

    const response = await askToJoin(app, user, questId);

    expect(response.status).toBe(201);
    const sent = {
      id: ANY_STRING,
      quest: {
        id: questId,
        title: '점심 같이',
        globalEvent: null,
        leader: { id: leader.id, name: '홍길동', department: '컴퓨터공학부' },
        holderCount: 1,
        capacity: 4,
        joinPolicy: 'approval',
        board: 'hobby',
        description: '',
        createdAt: ANY_STRING,
      },
      sentAt: ANY_STRING,
    };
    expect(response.body).toEqual(sent);
    expect((await getSentJoinRequests(app, user)).body).toEqual([sent]);
    expect((await getJoinRequests(app, leader, questId)).body).toEqual([
      { id: ANY_STRING, user: { id: user.id, name: '김철수', department: '경영학과' }, sentAt: ANY_STRING },
    ]);
    expect((await getQuests(app, user)).body).toEqual([]);
    await vi.waitFor(() => {
      // Making the Quest and the request.
      expect(signalsTo(leader)).toBe(2);
    });
  });
});

describe('Asking to join is refused', () => {
  it('for a second request to the same Quest', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId } = await asked(leader, user);

    const response = await askToJoin(app, user, questId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_JOIN_REQUEST_ALREADY_SENT'));
  });

  it('for an Open Quest, which the User joins instead', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });

    const response = await askToJoin(app, user, questId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_NOT_APPROVAL'));
  });

  it.each([
    ['a Closed Quest', 'closed'],
    ['a Quest that does not exist', null],
  ])('for %s', async (_, joinPolicy) => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const questId = joinPolicy === null ? randomUUID() : await ownQuest(app, leader, { joinPolicy });

    const response = await askToJoin(app, user, questId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });

  it('for a Quest the User holds', async () => {
    const leader = await signInUser(app);
    const questId = await ownQuest(app, leader, { joinPolicy: 'approval' });

    const response = await askToJoin(app, leader, questId);

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'ALREADY_HOLDER'));
  });
});

describe('Withdrawing a request', () => {
  it('ends it, and tells the Leader', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId, requestId } = await asked(leader, user);

    const response = await withdrawJoinRequest(app, user, requestId);

    expect(response.status).toBe(204);
    expect((await getSentJoinRequests(app, user)).body).toEqual([]);
    expect((await getJoinRequests(app, leader, questId)).body).toEqual([]);
    await vi.waitFor(() => {
      expect(signalsTo(leader)).toBe(3);
    });
  });

  it('is refused to another User', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { requestId } = await asked(leader, user);

    const response = await withdrawJoinRequest(app, leader, requestId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_JOIN_REQUEST_NOT_FOUND'));
  });
});

describe('The Leader accepting a request', () => {
  it('makes the User a Holder, ends the request, and tells the Holders', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId, requestId } = await asked(leader, user);

    const response = await answerJoinRequest(app, leader, { questId, requestId }, 'accept');

    expect(response.status).toBe(204);
    expect((await getQuest(app, user, questId)).body).toMatchObject({
      leader: { id: leader.id },
      holders: [{ id: leader.id }, { id: user.id }],
    });
    expect((await getJoinRequests(app, leader, questId)).body).toEqual([]);
    expect((await getSentJoinRequests(app, user)).body).toEqual([]);
    await vi.waitFor(() => {
      expect(signalsTo(user)).toBe(1);
      expect(signalsTo(leader)).toBe(3);
    });
  });

  it.each(['open', 'closed'])('still works once the Leader made the Quest %s', async (joinPolicy) => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId, requestId } = await asked(leader, user);
    await setQuest(app, leader, questId, { joinPolicy });

    const response = await answerJoinRequest(app, leader, { questId, requestId }, 'accept');

    expect(response.status).toBe(204);
    expect((await getQuest(app, user, questId)).status).toBe(200);
  });
});

describe('The Leader accepting a request is refused', () => {
  it('when the Quest is full, and the request still waits', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId, requestId } = await asked(leader, user, { capacity: 1 });

    const response = await answerJoinRequest(app, leader, { questId, requestId }, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_FULL'));
    expect((await getJoinRequests(app, leader, questId)).body).toHaveLength(1);
  });

  it('when the Quest has no Sub Quest ahead', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const endsAt = new Date(Date.now() - 1000).toISOString();
    const { questId, requestId } = await asked(leader, user, { subQuest: { title: '점심', endsAt } });

    const response = await answerJoinRequest(app, leader, { questId, requestId }, 'accept');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'QUEST_ENDED'));
  });
});

describe('The Leader declining a request', () => {
  it('ends it, leaves the User out, and tells the User', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId, requestId } = await asked(leader, user);

    const response = await answerJoinRequest(app, leader, { questId, requestId }, 'decline');

    expect(response.status).toBe(204);
    expect((await getSentJoinRequests(app, user)).body).toEqual([]);
    expect((await getQuest(app, user, questId)).status).toBe(404);
    await vi.waitFor(() => {
      expect(signalsTo(user)).toBe(1);
    });
  });
});

describe('Answering a request is refused', () => {
  it.each(['accept', 'decline'] as const)('to %s one answered already', async (answer) => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId, requestId } = await asked(leader, user);
    await answerJoinRequest(app, leader, { questId, requestId }, 'decline');

    const response = await answerJoinRequest(app, leader, { questId, requestId }, answer);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_JOIN_REQUEST_NOT_FOUND'));
  });

  it('for a request to another Quest of the Leader', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { requestId } = await asked(leader, user);
    const otherQuestId = await ownQuest(app, leader, { joinPolicy: 'approval' });

    const response = await answerJoinRequest(app, leader, { questId: otherQuestId, requestId }, 'accept');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_JOIN_REQUEST_NOT_FOUND'));
  });
});

describe('The Leader’s part of requests', () => {
  it('is refused to another Holder: listing, accepting and declining', async () => {
    const [leader, holder, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const questId = await ownQuest(app, leader, { joinPolicy: 'open' });
    await joinQuest(app, holder, questId);
    await setQuest(app, leader, questId, { joinPolicy: 'approval' });
    const requestId = await joinRequestOf(app, user, questId);

    const responses = await Promise.all([
      getJoinRequests(app, holder, questId),
      answerJoinRequest(app, holder, { questId, requestId }, 'accept'),
      answerJoinRequest(app, holder, { questId, requestId }, 'decline'),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject(refused(403, 'NOT_QUEST_LEADER'));
    }
    expect((await getJoinRequests(app, leader, questId)).body).toHaveLength(1);
  });

  it('is refused to a User who does not hold the Quest', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const { questId } = await asked(leader, user);

    const response = await getJoinRequests(app, user, questId);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'QUEST_NOT_FOUND'));
  });
});
