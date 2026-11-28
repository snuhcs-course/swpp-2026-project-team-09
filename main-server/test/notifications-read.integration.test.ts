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
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { keptNotifications } from './kept-notifications.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// Which of the User's Notifications are read: `POST /notifications/read`, `read` in `GET /notifications`, and the
// writes that make one unread again.

const QUEST_ID = '6a1e2f3c-4b5d-4e6f-8a7b-9c0d1e2f3a4b';
const OTHER_QUEST_ID = '7b2f3a4d-5c6e-4f70-9b8c-0d1e2f3a4b5c';
const FRIEND_ID = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

let app: INestApplication<Server>;
let notifications: NotificationsService;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  // Imported after startApp, so that it is the one AppModule registers.
  const { NotificationsService: registered } = await import('../src/notifications/notifications.service.js');
  notifications = app.get(registered);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await app.close();
});

function markRead(user: TestUser | null): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/notifications/read'), user?.accessToken);
}

// Each kept Notification's identity with whether it is read, those whose time is still to come included.
async function readById(user: TestUser): Promise<Record<string, boolean>> {
  return Object.fromEntries((await keptNotifications(app, user.id)).map(({ id, read }) => [id, read]));
}

const accepted = (friendName: string, questId = QUEST_ID) =>
  ({ kind: 'accepted', questId, questTitle: '저녁 같이', friendId: FRIEND_ID, friendName }) as const;

describe('POST /notifications/read', () => {
  const NOW = new Date('2026-11-14T04:00:00Z');
  const FIRST = `accepted:party:${QUEST_ID}:${FRIEND_ID}`;
  const SECOND = `accepted:party:${OTHER_QUEST_ID}:${FRIEND_ID}`;

  beforeEach(() => {
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
  });

  it('marks read the User’s Notifications whose time has come, leaving one still ahead and other Users’ unread', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    await notifications.schedule(user.id, accepted('민수'), new Date('2026-11-14T02:58:00Z'));
    await notifications.schedule(user.id, accepted('지은', OTHER_QUEST_ID), new Date('2026-11-14T05:00:00Z'));
    await notifications.schedule(other.id, accepted('철수'), new Date('2026-11-14T03:00:00Z'));

    const response = await markRead(user);

    expect(response.status).toBe(204);
    expect(await readById(user)).toEqual({ [FIRST]: true, [SECOND]: false });
    expect(await readById(other)).toEqual({ [FIRST]: false });
  });

  it('marks read one whose time has come since, on a second call', async () => {
    const user = await signInUser(app);
    await notifications.schedule(user.id, accepted('지은', OTHER_QUEST_ID), new Date('2026-11-14T05:00:00Z'));
    await markRead(user);
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date('2026-11-14T05:00:00Z'));

    await markRead(user);

    expect(await readById(user)).toEqual({ [SECOND]: true });
  });

  it('answers 401 without a sign-in', async () => {
    expect((await markRead(null)).status).toBe(401);
  });
});

describe('A read Notification written again', () => {
  const NOW = new Date('2026-11-14T04:00:00Z');
  const ID = `accepted:party:${QUEST_ID}:${FRIEND_ID}`;
  let user: TestUser;

  beforeEach(async () => {
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
    user = await signInUser(app);
    await notifications.schedule(user.id, accepted('민수'), new Date('2026-11-14T02:58:00Z'));
    await markRead(user);
  });

  it('is unread again on a second schedule, which rings it again', async () => {
    await notifications.schedule(user.id, accepted('민수'), new Date('2026-11-14T03:30:00Z'));

    expect(await readById(user)).toEqual({ [ID]: false });
  });

  it('is unread again on a replace that moves its time', async () => {
    await notifications.replace(user.id, accepted('민수'), new Date('2026-11-14T03:30:00Z'));

    expect(await readById(user)).toEqual({ [ID]: false });
  });

  it('stays read on a replace that keeps its time', async () => {
    await notifications.replace(user.id, accepted('지은'), new Date('2026-11-14T02:58:00Z'));

    expect(await readById(user)).toEqual({ [ID]: true });
  });

  it('stays read on a renew, which keeps whether it was sent', async () => {
    await notifications.renew(user.id, accepted('민수'), new Date('2026-11-14T03:30:00Z'));

    expect(await readById(user)).toEqual({ [ID]: true });
  });
});
