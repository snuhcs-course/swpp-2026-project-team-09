/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { placeNumbered } from './friend-levels.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { getInvitations, invite } from './quest-recruiting.js';
import { ownQuest } from './quests.js';
import { startApp } from './start-app.js';

// When and where the Quest of an invitation next meets, as GET /quest-invitations carries it (P06 ticket 24): a
// 비공개 파티's post cannot be read before entering, so the card says them.

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

// A Leader and a Friend of theirs.
async function friends(): Promise<[TestUser, TestUser]> {
  const [leader, friend] = await Promise.all([signInUser(app), signInUser(app)]);
  await befriend(app, leader, friend);
  return [leader, friend];
}

describe('An invitation as the invited User lists it', () => {
  it('carries when and where its Quest next meets: the start and the place with its point', async () => {
    const [leader, friend] = await friends();
    const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const place = { latitude: 37.4602, longitude: 126.9523, label: '301동 앞' };
    const questId = await ownQuest(app, leader, { subQuest: { title: '저녁', startsAt, place } });
    await invite(app, leader, questId, friend.id).expect(204);

    const response = await getInvitations(app, friend);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      { nextSubQuest: { title: '저녁', startsAt, place: { placeId: null, ...place } } },
    ]);
  });

  it('carries a Place from the list with its id, its name and its point', async () => {
    const [leader, friend] = await friends();
    const library = await placeNumbered(app, leader, '62');
    const questId = await ownQuest(app, leader, { subQuest: { title: '공부', place: { placeId: library.id } } });
    await invite(app, leader, questId, friend.id).expect(204);

    const response = await getInvitations(app, friend);

    expect(response.body).toMatchObject([
      {
        nextSubQuest: {
          place: { placeId: library.id, label: library.name, latitude: library.latitude, longitude: library.longitude },
        },
      },
    ]);
  });

  it('carries no start and no place for a Quest that has neither yet', async () => {
    const [leader, friend] = await friends();
    const questId = await ownQuest(app, leader, { subQuest: { title: '산책' } });
    await invite(app, leader, questId, friend.id).expect(204);

    const response = await getInvitations(app, friend);

    expect(response.body).toMatchObject([{ nextSubQuest: { title: '산책', startsAt: null, place: null } }]);
  });
});
