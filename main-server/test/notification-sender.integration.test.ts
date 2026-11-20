/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-20  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { type NotificationSender } from '../src/notifications/notification-sender.js';
import { type NotificationsService } from '../src/notifications/notifications.service.js';
import { type PushService } from '../src/push/push.service.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { ExpoPushStub, madeUpPushToken, pushServiceOf, registerPushToken } from './expo-push.js';
import { signInUser, TestUser } from './friends.js';
import { connectToDatabase } from './quests.js';
import { SignalWatcher, signalsWhile } from './signals.js';
import { startApp } from './start-app.js';
import { savedAnswer } from './walking-route.js';

const QUEST_ID = '6a1e2f3c-4b5d-4e6f-8a7b-9c0d1e2f3a4b';
const FRIEND_ID = 'c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
const LEAVE_BY = { kind: 'leave-by', questId: QUEST_ID, placeLabel: '학생회관식당', walkMinutes: 15 } as const;
const ACCEPTED = {
  kind: 'accepted',
  questId: QUEST_ID,
  questTitle: '저녁',
  friendId: FRIEND_ID,
  friendName: '민수',
} as const;
// 12:17, 12:18 and 12:30 in Korea on 4 January 2000. A step claims and deletes the rows of every User, whichever file
// kept them, so this file's Notifications stand in a year before every other file's.
const AT_1217 = new Date('2000-01-04T03:17:00Z');
const AT_1218 = new Date('2000-01-04T03:18:00Z');
const AT_1230 = new Date('2000-01-04T03:30:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const expo = new ExpoPushStub();
let app: INestApplication<Server>;
let watcher: SignalWatcher;
let prisma: PrismaClient;
let push: PushService;
let sender: NotificationSender;
let notifications: NotificationsService;
let clock: Clock;

beforeAll(async () => {
  [app, watcher] = await Promise.all([
    startApp(inject('settings'), [], undefined, undefined, [], undefined, undefined, {
      fetchExpo: expo.fetch,
    }),
    SignalWatcher.start(),
  ]);
  // Imported after startApp, so that they are the ones AppModule registers.
  const { NotificationSender: registeredSender } = await import('../src/notifications/notification-sender.js');
  const { NotificationsService: registeredService } = await import('../src/notifications/notifications.service.js');
  sender = app.get(registeredSender);
  notifications = app.get(registeredService);
  clock = app.get<Clock>(CLOCK);
  push = await pushServiceOf(app);
  prisma = connectToDatabase();
});

afterAll(async () => {
  await push.settled();
  await prisma.$disconnect();
  await watcher.stop();
  await app.close();
});

beforeEach(() => {
  expo.reset();
  expo.answers(savedAnswer('expo-push-ok'));
});

function clockAt(now: Date): void {
  vi.spyOn(clock, 'now').mockReturnValue(now);
}

async function signInRegistered(): Promise<TestUser & { token: string }> {
  const user = await signInUser(app);
  const token = madeUpPushToken();
  await registerPushToken(app, user.accessToken, token);
  return { ...user, token };
}

const messagesSchema = z.array(z.looseObject({ to: z.string() }));

// The messages the stand-in received for the token, once every push is settled.
async function pushedTo(token: string): Promise<unknown[]> {
  await push.settled();
  return expo.requests.flatMap(({ body }) => messagesSchema.parse(body)).filter(({ to }) => to === token);
}

describe('A time to leave', () => {
  it('sends nothing before the time to leave, the push once at it with a notice, and nothing at the next step', async () => {
    const user = await signInRegistered();
    await notifications.schedule(user.id, LEAVE_BY, AT_1218);

    clockAt(AT_1217);
    await sender.sendDue();
    expect(await pushedTo(user.token)).toEqual([]);

    clockAt(AT_1218);
    const notices = await signalsWhile(app, watcher, 'notice', () => sender.sendDue());
    expect(await pushedTo(user.token)).toEqual([
      {
        to: user.token,
        title: '지금 나서요',
        body: '학생회관식당까지 걸어서 15분이에요.',
        data: { url: `/main?card=party:${QUEST_ID}` },
        channelId: 'default',
        priority: 'high',
      },
    ]);
    expect(notices.filter(({ userIds }) => userIds?.includes(user.id) === true)).toHaveLength(1);

    expo.reset();
    expo.answers(savedAnswer('expo-push-ok'));
    await sender.sendDue();
    expect(await pushedTo(user.token)).toEqual([]);
  });
});

describe('A time to leave rescheduled after it was sent', () => {
  it('is sent again at the new time', async () => {
    const user = await signInRegistered();
    await notifications.schedule(user.id, LEAVE_BY, AT_1218);
    clockAt(AT_1218);
    await sender.sendDue();
    await notifications.schedule(user.id, LEAVE_BY, AT_1230);

    await sender.sendDue();
    expect(await pushedTo(user.token)).toHaveLength(1);

    clockAt(AT_1230);
    await sender.sendDue();
    expect(await pushedTo(user.token)).toHaveLength(2);
  });

  it('is not sent again on a replace that keeps its time, and is on one that moves it', async () => {
    const user = await signInRegistered();
    await notifications.schedule(user.id, LEAVE_BY, AT_1218);
    clockAt(AT_1230);
    await sender.sendDue();

    await notifications.replace(user.id, { ...LEAVE_BY, walkMinutes: 12 }, AT_1218);
    await sender.sendDue();
    expect(await pushedTo(user.token)).toHaveLength(1);

    await notifications.replace(user.id, LEAVE_BY, AT_1230);
    await sender.sendDue();
    expect(await pushedTo(user.token)).toHaveLength(2);
  });
});

describe('What a step sends and keeps', () => {
  it('never pushes an accepted Notification', async () => {
    const user = await signInRegistered();
    await notifications.schedule(user.id, ACCEPTED, AT_1217);

    clockAt(AT_1230);
    await sender.sendDue();

    expect(await pushedTo(user.token)).toEqual([]);
    expect((await prisma.notification.findFirstOrThrow({ where: { userId: user.id } })).sentAt).toBeNull();
  });

  it('sends a Notification once when two steps run at once', async () => {
    const user = await signInRegistered();
    await notifications.schedule(user.id, LEAVE_BY, AT_1218);

    clockAt(AT_1218);
    await Promise.all([sender.sendDue(), sender.sendDue()]);

    expect(await pushedTo(user.token)).toHaveLength(1);
  });

  it('skips a User without a push token without an error, and marks the Notification sent', async () => {
    const user = await signInUser(app);
    await notifications.schedule(user.id, LEAVE_BY, AT_1218);

    clockAt(AT_1218);
    await sender.sendDue();
    await push.settled();

    const row = await prisma.notification.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.sentAt).toEqual(AT_1218);
    expect(expo.requests).toEqual([]);
  });
});

describe('How long a Notification is kept', () => {
  it('deletes a Notification of 31 days ago and keeps one of 29 days ago', async () => {
    const user = await signInUser(app);
    await notifications.schedule(user.id, ACCEPTED, new Date(AT_1218.getTime() - 31 * DAY_MS));
    await notifications.schedule(user.id, { ...ACCEPTED, questId: 'kept' }, new Date(AT_1218.getTime() - 29 * DAY_MS));

    clockAt(AT_1218);
    await sender.sendDue();

    const left = await prisma.notification.findMany({ where: { userId: user.id }, select: { cardId: true } });
    expect(left).toEqual([{ cardId: 'kept' }]);
  });
});
