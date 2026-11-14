/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { answerInvitation, cancelInvitation, invitationOf } from './quest-recruiting.js';
import { ownQuest } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

// 11:58 in Korea.
const NOW = new Date('2026-11-14T02:58:00Z');

let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

beforeEach(() => {
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function getNotifications(user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/notifications'), user.accessToken);
}

// A Leader, a Friend named `friendName`, and an invitation of the Friend into the Leader's Quest `저녁 같이`.
async function invitedFriend(
  friendName: string,
): Promise<{ leader: TestUser; friend: TestUser; questId: string; invitationId: string }> {
  const [leader, friend] = await Promise.all([
    signInUser(app, { name: '김리더', department: '컴퓨터공학부' }),
    signInUser(app, { name: friendName, department: '경제학부' }),
  ]);
  await befriend(app, leader, friend);
  const questId = await ownQuest(app, leader, { title: '저녁 같이' });
  return { leader, friend, questId, invitationId: await invitationOf(app, leader, questId, friend) };
}

async function expectNoticeTo(user: TestUser): Promise<void> {
  await vi.waitFor(() => {
    expect(watcher.for(user).map(({ name }) => name)).toContain('notice');
  });
}

describe('An invited User accepting', () => {
  it('gives the Leader one Notification on the party’s card, and the User none', async () => {
    const { leader, friend, questId, invitationId } = await invitedFriend('민수');

    expect((await answerInvitation(app, friend, invitationId, 'accept')).status).toBe(201);

    await vi.waitFor(async () => {
      expect((await getNotifications(leader)).body).toEqual([
        {
          id: `accepted:party:${questId}`,
          kind: 'accepted',
          title: '민수가 수락했어요',
          line: '저녁 같이',
          at: '2026-11-14T11:58:00+09:00',
          url: `/main?card=party:${questId}`,
        },
      ]);
    });
    await expectNoticeTo(leader);
    expect((await getNotifications(friend)).body).toEqual([]);
  });
});

describe('An invited User declining', () => {
  it('gives the Leader one Notification that the User cannot come, and the User none', async () => {
    const { leader, friend, questId, invitationId } = await invitedFriend('지은');

    expect((await answerInvitation(app, friend, invitationId, 'decline')).status).toBe(204);

    await vi.waitFor(async () => {
      expect((await getNotifications(leader)).body).toEqual([
        {
          id: `declined:party:${questId}`,
          kind: 'declined',
          title: '지은이 못 온대요',
          line: '저녁 같이',
          at: '2026-11-14T11:58:00+09:00',
          url: `/main?card=party:${questId}`,
        },
      ]);
    });
    await expectNoticeTo(leader);
    expect((await getNotifications(friend)).body).toEqual([]);
  });
});

describe('An invited User answering when the Leader cannot be told', () => {
  it.each([
    ['accept', 201],
    ['decline', 204],
  ] as const)('is answered as before to %s', async (answer, status) => {
    const { NotificationsService } = await import('../src/notifications/notifications.service.js');
    vi.spyOn(app.get(NotificationsService), 'schedule').mockRejectedValue(new Error('Redis refused the write'));
    const warn = vi.spyOn(Logger.prototype, 'warn');
    const { leader, friend, invitationId } = await invitedFriend('민수');

    expect((await answerInvitation(app, friend, invitationId, answer)).status).toBe(status);

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        `The Leader was not told of an invitation answered: Error: Redis refused the write`,
      );
    });
    expect((await getNotifications(leader)).body).toEqual([]);
  });
});

describe('The Leader cancelling an invitation', () => {
  it('gives nobody a Notification', async () => {
    const { leader, friend, questId, invitationId } = await invitedFriend('민수');

    expect((await cancelInvitation(app, leader, questId, invitationId)).status).toBe(204);

    expect((await getNotifications(leader)).body).toEqual([]);
    expect((await getNotifications(friend)).body).toEqual([]);
  });
});
