/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type NotificationsService } from '../src/notifications/notifications.service.js';
import { signInUser, TestUser } from './friends.js';
import { keptNotifications } from './kept-notifications.js';
import { withAccessToken } from './sign-in.js';
import { SignalWatcher, signalsWhile } from './signals.js';
import { startApp } from './start-app.js';

// `DELETE /notifications/:id`, by the list's identity, from a swipe on a row of 알림, and `DELETE /notifications`, from its
// 모두 지우기 (P06 ticket 40).

const QUEST_ID = '6a1e2f3c-4b5d-4e6f-8a7b-9c0d1e2f3a4b';
const OTHER_QUEST_ID = '7b2f3a4d-5c6e-4f70-9b8c-0d1e2f3a4b5c';
const FRIEND_ID = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const ID = `accepted:party:${QUEST_ID}:${FRIEND_ID}`;
const OTHER_ID = `accepted:party:${OTHER_QUEST_ID}:${FRIEND_ID}`;
const AT = new Date('2026-11-14T02:58:00Z');
// Ahead of the time the tests run: 지금 나서요 of a Quest in 2200.
const AHEAD = new Date('2199-12-31T15:00:00Z');

let app: INestApplication<Server>;
let watcher: SignalWatcher;
let notifications: NotificationsService;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(inject('settings')), SignalWatcher.start()]);
  // Imported after startApp, so that it is the one AppModule registers.
  const { NotificationsService: registered } = await import('../src/notifications/notifications.service.js');
  notifications = app.get(registered);
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

function deleteNotification(user: TestUser | null, id: string): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).delete(`/notifications/${encodeURIComponent(id)}`),
    user?.accessToken,
  );
}

const accepted = (questId: string) =>
  ({ kind: 'accepted', questId, questTitle: '저녁 같이', friendId: FRIEND_ID, friendName: '민수' }) as const;

// In the order of the identities: the list's order of two kept at one time is the order they were kept.
async function idsOf(user: TestUser): Promise<string[]> {
  return (await keptNotifications(app, user.id)).map(({ id }) => id).toSorted();
}

function deleteAll(user: TestUser | null): request.Test {
  return withAccessToken(request(app.getHttpServer()).delete('/notifications'), user?.accessToken);
}

async function keepTwo(user: TestUser): Promise<void> {
  await notifications.schedule(user.id, accepted(QUEST_ID), AT);
  await notifications.schedule(user.id, accepted(OTHER_QUEST_ID), AT);
}

describe('DELETE /notifications/:id', () => {
  it('deletes the User’s own one by the list’s identity, keeps the others and tells the User', async () => {
    const user = await signInUser(app);
    await keepTwo(user);
    let status: number | undefined;

    const signals = await signalsWhile(app, watcher, 'notice', async () => {
      status = (await deleteNotification(user, ID)).status;
    });

    expect(status).toBe(204);
    expect(await idsOf(user)).toEqual([OTHER_ID]);
    expect(signals.filter(({ userIds }) => userIds?.includes(user.id) === true)).toHaveLength(1);
  });

  it('deletes nothing of another User’s', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    await keepTwo(other);

    expect((await deleteNotification(user, ID)).status).toBe(204);
    expect(await idsOf(other)).toEqual([ID, OTHER_ID]);
  });

  it.each([
    ['one already gone', ID],
    ['a kind no Notification has', `seat-ready:party:${QUEST_ID}`],
    ['an identity without its card', 'accepted'],
    ['an identity with a part too many', `${ID}:more`],
  ])('deletes nothing for %s', async (_, id) => {
    const user = await signInUser(app);
    await notifications.schedule(user.id, accepted(OTHER_QUEST_ID), AT);

    expect((await deleteNotification(user, id)).status).toBe(204);
    expect(await idsOf(user)).toEqual([OTHER_ID]);
  });

  it('answers 401 without a sign-in', async () => {
    expect((await deleteNotification(null, ID)).status).toBe(401);
  });
});

describe('DELETE /notifications', () => {
  it('deletes the User’s own whose time has come, keeps those ahead and tells the User', async () => {
    const user = await signInUser(app);
    await notifications.schedule(user.id, accepted(QUEST_ID), AT);
    await notifications.schedule(user.id, accepted(OTHER_QUEST_ID), AHEAD);
    let status: number | undefined;

    const signals = await signalsWhile(app, watcher, 'notice', async () => {
      status = (await deleteAll(user)).status;
    });

    expect(status).toBe(204);
    expect(await idsOf(user)).toEqual([OTHER_ID]);
    expect(signals.filter(({ userIds }) => userIds?.includes(user.id) === true)).toHaveLength(1);
  });

  it('keeps the copies of what waits, which 알림 shows from the lists that wait', async () => {
    const user = await signInUser(app);
    await notifications.schedule(user.id, accepted(QUEST_ID), AT);
    const party = { questId: OTHER_QUEST_ID, questTitle: '저녁 같이' };
    await notifications.schedule(user.id, { kind: 'join-asked', ...party, name: '민수', waiting: 1 }, AT);
    await notifications.schedule(user.id, { kind: 'party-activated', ...party, byName: '민수' }, AT);

    expect((await deleteAll(user)).status).toBe(204);
    expect(await idsOf(user)).toEqual([
      `join-asked:party:${OTHER_QUEST_ID}`,
      `party-activated:party:${OTHER_QUEST_ID}`,
    ]);
  });

  it('deletes nothing of another User’s', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    await keepTwo(other);

    expect((await deleteAll(user)).status).toBe(204);
    expect(await idsOf(other)).toEqual([ID, OTHER_ID]);
  });

  it('answers 401 without a sign-in', async () => {
    expect((await deleteAll(null)).status).toBe(401);
  });
});
