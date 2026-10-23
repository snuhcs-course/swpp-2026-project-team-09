/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser, TestUser } from './friends.js';
import { answerJoinRequest, joinRequestOf, withdrawJoinRequest } from './quest-recruiting.js';
import { getQuest, getQuests, ownQuest } from './quests.js';
import { SignalWatcher } from './signals.js';
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

// The User's Quests, in the order they were made, with the number of requests to join waiting in each.
async function expectWaiting(user: TestUser, waiting: [questId: string, count: number][]): Promise<void> {
  // An array matches only an array of the same length.
  expect((await getQuests(app, user)).body).toMatchObject(
    waiting.map(([id, count]) => ({ id, waitingJoinRequests: count })),
  );
}

// The Leader's Approval Quest, with a request to join from each of `users`.
async function askedBy(leader: TestUser, users: TestUser[]): Promise<{ questId: string; requestIds: string[] }> {
  const questId = await ownQuest(app, leader, { joinPolicy: 'approval' });
  const requestIds = await Promise.all(users.map((user) => joinRequestOf(app, user, questId)));
  return { questId, requestIds };
}

describe('The requests to join waiting in the User’s Quests', () => {
  it('are counted on each Quest the User leads', async () => {
    const [leader, first, second] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const { questId } = await askedBy(leader, [first, second]);
    const quiet = await ownQuest(app, leader, { joinPolicy: 'approval' });

    await expectWaiting(leader, [
      [questId, 2],
      [quiet, 0],
    ]);
    expect((await getQuest(app, leader, questId)).body).toMatchObject({ waitingJoinRequests: 2 });
  });

  it('go down as the Leader accepts or declines, and with a withdrawal', async () => {
    const [leader, accepted, declined, withdrawing] = await Promise.all([
      signInUser(app),
      signInUser(app),
      signInUser(app),
      signInUser(app),
    ]);
    const {
      questId,
      requestIds: [acceptedId, declinedId, withdrawnId],
    } = await askedBy(leader, [accepted, declined, withdrawing]);

    await answerJoinRequest(app, leader, { questId, requestId: acceptedId ?? '' }, 'accept');
    await expectWaiting(leader, [[questId, 2]]);
    await answerJoinRequest(app, leader, { questId, requestId: declinedId ?? '' }, 'decline');
    await expectWaiting(leader, [[questId, 1]]);
    await withdrawJoinRequest(app, withdrawing, withdrawnId ?? '');
    await expectWaiting(leader, [[questId, 0]]);
  });

  it('are 0 for a Holder who does not lead the Quest', async () => {
    const [leader, holder, user] = await Promise.all([signInUser(app), signInUser(app), signInUser(app)]);
    const {
      questId,
      requestIds: [holderId],
    } = await askedBy(leader, [holder]);
    await answerJoinRequest(app, leader, { questId, requestId: holderId ?? '' }, 'accept');
    await joinRequestOf(app, user, questId);

    await expectWaiting(holder, [[questId, 0]]);
    await expectWaiting(leader, [[questId, 1]]);
  });
});

describe('Declining a request', () => {
  it('tells the Leader too, whose count of waiting requests changed', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const {
      questId,
      requestIds: [requestId],
    } = await askedBy(leader, [user]);
    await vi.waitFor(() => {
      // Making the Quest and the request.
      expect(signalsTo(leader)).toBe(2);
    });

    await answerJoinRequest(app, leader, { questId, requestId: requestId ?? '' }, 'decline');

    await vi.waitFor(() => {
      expect(signalsTo(leader)).toBe(3);
    });
  });
});
