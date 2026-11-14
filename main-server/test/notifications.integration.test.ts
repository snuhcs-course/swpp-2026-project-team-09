/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { type Redis } from 'ioredis';
import request from 'supertest';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { type NotificationsService } from '../src/notifications/notifications.service.js';
import { signInUser, TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';
import { SignalWatcher, signalsWhile } from './signals.js';
import { startApp } from './start-app.js';

const QUEST_ID = '6a1e2f3c-4b5d-4e6f-8a7b-9c0d1e2f3a4b';
const OTHER_QUEST_ID = '7b2f3a4d-5c6e-4f70-9b8c-0d1e2f3a4b5c';
const FRIEND_ID = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const OTHER_FRIEND_ID = 'd2e3f4a5-6b7c-4d8e-9f0a-1b2c3d4e5f6a';

let app: INestApplication<Server>;
let watcher: SignalWatcher;
let notifications: NotificationsService;
let redis: Redis;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
  // Imported after startApp, so that they are the ones AppModule registers.
  const { NotificationsService: registered } = await import('../src/notifications/notifications.service.js');
  const { REDIS } = await import('../src/common/redis.module.js');
  notifications = app.get(registered);
  redis = app.get<Redis>(REDIS);
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

function getNotifications(user: TestUser | null): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/notifications'), user?.accessToken);
}

const accepted = (friendName: string, questId = QUEST_ID, friendId = FRIEND_ID) =>
  ({ kind: 'accepted', questId, questTitle: '저녁 같이', friendId, friendName }) as const;

async function noticesWhile(user: TestUser, act: () => Promise<unknown>): Promise<number> {
  const signals = await signalsWhile(app, watcher, 'notice', act);
  return signals.filter(({ userIds }) => userIds?.includes(user.id) === true).length;
}

describe('GET /notifications', () => {
  it('answers the signed-in User’s Notifications, the latest first, in Korea time, with each one’s address', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    await notifications.schedule(user.id, accepted('민수'), new Date('2026-11-14T02:58:00Z'));
    await notifications.schedule(
      user.id,
      { kind: 'declined', questId: OTHER_QUEST_ID, questTitle: '점심', friendId: FRIEND_ID, friendName: '지은' },
      new Date('2026-11-14T03:10:00Z'),
    );
    await notifications.schedule(other.id, accepted('철수'), new Date('2026-11-14T03:00:00Z'));

    const response = await getNotifications(user);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      {
        id: 'declined:party:7b2f3a4d-5c6e-4f70-9b8c-0d1e2f3a4b5c:c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
        kind: 'declined',
        title: '지은이 못 온대요',
        line: '점심',
        at: '2026-11-14T12:10:00+09:00',
        url: '/main?card=party:7b2f3a4d-5c6e-4f70-9b8c-0d1e2f3a4b5c',
      },
      {
        id: 'accepted:party:6a1e2f3c-4b5d-4e6f-8a7b-9c0d1e2f3a4b:c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
        kind: 'accepted',
        title: '민수가 수락했어요',
        line: '저녁 같이',
        at: '2026-11-14T11:58:00+09:00',
        url: '/main?card=party:6a1e2f3c-4b5d-4e6f-8a7b-9c0d1e2f3a4b',
      },
    ]);
  });

  it('answers an empty list to a User with none', async () => {
    const user = await signInUser(app);

    expect((await getNotifications(user)).body).toEqual([]);
  });

  it('answers 401 without a sign-in', async () => {
    expect((await getNotifications(null)).status).toBe(401);
  });
});

describe('A second schedule through the service', () => {
  it('overwrites one kept under the same identity on a second schedule, and tells the User each time', async () => {
    const user = await signInUser(app);

    const notices = await noticesWhile(user, async () => {
      await notifications.schedule(user.id, accepted('민수'), new Date('2026-11-14T02:58:00Z'));
      await notifications.schedule(user.id, accepted('지은'), new Date('2026-11-14T03:05:00Z'));
    });

    expect(notices).toBe(2);
    expect((await getNotifications(user)).body).toEqual([
      expect.objectContaining({ title: '지은이 수락했어요', at: '2026-11-14T12:05:00+09:00' }),
    ]);
  });
});

describe('Two Friends who answered about one card', () => {
  it('are kept as two Notifications, and a cancel of one keeps the other', async () => {
    const user = await signInUser(app);
    await notifications.schedule(user.id, accepted('민수'), new Date('2026-11-14T02:58:00Z'));
    await notifications.schedule(
      user.id,
      accepted('지은', QUEST_ID, OTHER_FRIEND_ID),
      new Date('2026-11-14T03:05:00Z'),
    );

    expect((await getNotifications(user)).body).toEqual([
      expect.objectContaining({ id: `accepted:party:${QUEST_ID}:${OTHER_FRIEND_ID}`, title: '지은이 수락했어요' }),
      expect.objectContaining({ id: `accepted:party:${QUEST_ID}:${FRIEND_ID}`, title: '민수가 수락했어요' }),
    ]);

    await notifications.cancel(user.id, 'accepted', { kind: 'party', id: QUEST_ID }, FRIEND_ID);

    expect((await getNotifications(user)).body).toEqual([
      expect.objectContaining({ id: `accepted:party:${QUEST_ID}:${OTHER_FRIEND_ID}` }),
    ]);
  });
});

describe('A replace through the service', () => {
  it('keeps nothing on a replace without a kept one, answers false and tells nobody', async () => {
    const user = await signInUser(app);
    let replaced: boolean | undefined;

    const notices = await noticesWhile(user, async () => {
      replaced = await notifications.replace(user.id, accepted('민수'), new Date('2026-11-14T02:58:00Z'));
    });

    expect(replaced).toBe(false);
    expect(notices).toBe(0);
    expect((await getNotifications(user)).body).toEqual([]);
  });

  it('changes the time and the words of a kept one on a replace, answers true and tells the User', async () => {
    const user = await signInUser(app);
    await notifications.schedule(user.id, accepted('민수'), new Date('2026-11-14T02:58:00Z'));
    let replaced: boolean | undefined;

    const notices = await noticesWhile(user, async () => {
      replaced = await notifications.replace(user.id, accepted('지은'), new Date('2026-11-14T04:00:00Z'));
    });

    expect(replaced).toBe(true);
    expect(notices).toBe(1);
    expect((await getNotifications(user)).body).toEqual([
      expect.objectContaining({ title: '지은이 수락했어요', at: '2026-11-14T13:00:00+09:00' }),
    ]);
  });
});

describe('A cancel through the service', () => {
  it('forgets one on a cancel and tells the User, keeping the others', async () => {
    const user = await signInUser(app);
    await notifications.schedule(user.id, accepted('민수'), new Date('2026-11-14T02:58:00Z'));
    await notifications.schedule(user.id, accepted('지은', OTHER_QUEST_ID), new Date('2026-11-14T03:00:00Z'));

    const notices = await noticesWhile(user, () =>
      notifications.cancel(user.id, 'accepted', { kind: 'party', id: QUEST_ID }, FRIEND_ID),
    );

    expect(notices).toBe(1);
    expect((await getNotifications(user)).body).toEqual([
      expect.objectContaining({
        id: 'accepted:party:7b2f3a4d-5c6e-4f70-9b8c-0d1e2f3a4b5c:c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
      }),
    ]);
  });
});

describe('What the service keeps of a User', () => {
  it('drops the one with the earliest time when a 101st is kept', async () => {
    const user = await signInUser(app);
    // 100 Notifications a minute apart from 00:00 UTC, kept out of order, the earliest at 00:00.
    await Promise.all(
      [...Array.from({ length: 99 }, (_, index) => index + 1), 0].map((minute) =>
        notifications.schedule(
          user.id,
          accepted('민수', `party-${String(minute)}`),
          new Date(Date.UTC(2026, 10, 14, 0, minute)),
        ),
      ),
    );

    await notifications.schedule(user.id, accepted('민수', 'party-new'), new Date('2026-11-14T03:00:00Z'));

    const ids = z
      .array(z.object({ id: z.string() }))
      .parse((await getNotifications(user)).body)
      .map(({ id }) => id);
    expect(ids).toHaveLength(100);
    expect(ids).toContain('accepted:party:party-new:c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f');
    expect(ids).toContain('accepted:party:party-1:c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f');
    expect(ids).not.toContain('accepted:party:party-0:c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f');
  });
});

describe('What the service refuses and leaves out', () => {
  it('refuses one whose card no address opens, keeping nothing and telling nobody', async () => {
    const user = await signInUser(app);
    let refusal: unknown;

    const notices = await noticesWhile(user, async () => {
      await notifications
        .schedule(user.id, accepted('민수', 'a quest/id'), new Date('2026-11-14T02:58:00Z'))
        .catch((error: unknown) => {
          refusal = error;
        });
    });

    expect(refusal).toEqual(new Error('No address opens the card party:a quest/id'));
    expect(notices).toBe(0);
    expect((await getNotifications(user)).body).toEqual([]);
  });

  it('leaves out one it cannot read, and answers the others', async () => {
    const user = await signInUser(app);
    await notifications.schedule(user.id, accepted('민수'), new Date('2026-11-14T02:58:00Z'));
    await redis.hset(
      `notifications:${user.id}`,
      'a-later-kind:party:7b2f3a4d-5c6e-4f70-9b8c-0d1e2f3a4b5c',
      JSON.stringify({
        kind: 'a-later-kind',
        card: { kind: 'party', id: OTHER_QUEST_ID },
        at: '2026-11-14T03:00:00.000Z',
        title: '나중 버전의 알림',
        line: '점심',
      }),
    );

    expect((await getNotifications(user)).body).toEqual([
      expect.objectContaining({
        id: 'accepted:party:6a1e2f3c-4b5d-4e6f-8a7b-9c0d1e2f3a4b:c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
      }),
    ]);
  });
});

describe('How long the service keeps a User’s Notifications', () => {
  it('gives the User’s Notifications a time to live of 7 days after a schedule', async () => {
    const user = await signInUser(app);

    await notifications.schedule(user.id, accepted('민수'), new Date('2026-11-14T02:58:00Z'));

    const ttl = await redis.ttl(`notifications:${user.id}`);
    expect(ttl).toBeGreaterThan(7 * 24 * 60 * 60 - 10);
    expect(ttl).toBeLessThanOrEqual(7 * 24 * 60 * 60);
  });
});
