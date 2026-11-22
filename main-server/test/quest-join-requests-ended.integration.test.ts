/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser } from './friends.js';
import { askToJoin, getJoinRequests, getSentJoinRequests } from './quest-recruiting.js';
import { ownQuest } from './quests.js';
import { startApp } from './start-app.js';

// Requests to join a Quest with no Sub Quest ahead, which stay stored but are listed neither to the User who asked nor
// to the Leader.

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

// The only Sub Quest passed a second before the test file started, so the Quest has none ahead.
const ENDED = {
  joinPolicy: 'approval',
  subQuest: { title: '점심', endsAt: new Date(Date.now() - 1000).toISOString() },
};

describe('A request to join a Quest with no Sub Quest ahead', () => {
  it('is left out of the User’s requests, which keep one to a Quest with a Sub Quest ahead', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const [ended, ahead] = await Promise.all([
      ownQuest(app, leader, ENDED),
      ownQuest(app, leader, { joinPolicy: 'approval' }),
    ]);
    await askToJoin(app, user, ended).expect(201);
    await askToJoin(app, user, ahead).expect(201);

    const response = await getSentJoinRequests(app, user);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([{ quest: { id: ahead } }]);
  });

  it('is left out of the Leader’s requests to the Quest', async () => {
    const [leader, user] = await Promise.all([signInUser(app), signInUser(app)]);
    const ended = await ownQuest(app, leader, ENDED);
    await askToJoin(app, user, ended).expect(201);

    const response = await getJoinRequests(app, leader, ended);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
