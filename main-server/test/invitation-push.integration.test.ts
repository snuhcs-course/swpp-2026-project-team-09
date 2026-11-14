/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { type PushService } from '../src/push/push.service.js';
import { ExpoPushStub, madeUpPushToken, pushServiceOf, registerPushToken } from './expo-push.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { answerInvitation, getInvitations, invitationOf, invite } from './quest-recruiting.js';
import { connectToDatabase, ownQuest } from './quests.js';
import { ONBOARDED_PROFILE, postSignOut, sessionOf } from './sign-in.js';
import { startApp } from './start-app.js';
import { savedAnswer } from './walking-route.js';

const expo = new ExpoPushStub();
let app: INestApplication<Server>;
let prisma: PrismaClient;
let push: PushService;

// What the server logs, kept in place of printing it.
const logged: string[] = [];

beforeAll(async () => {
  for (const level of ['log', 'warn', 'debug', 'error'] as const) {
    vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
      logged.push(String(message));
    });
  }
  app = await startApp(inject('settings'), [], undefined, undefined, undefined, [], undefined, undefined, {
    fetchExpo: expo.fetch,
  });
  push = await pushServiceOf(app);
  prisma = connectToDatabase();
});

afterAll(async () => {
  await push.settled();
  await prisma.$disconnect();
  await app.close();
});

beforeEach(() => {
  logged.length = 0;
  expo.reset();
  expo.answers(savedAnswer('expo-push-ok'));
});

afterEach(async () => {
  await push.settled();
  expect(logged.filter((line) => line.includes('PushToken['))).toEqual([]);
});

function settled(): Promise<void> {
  return push.settled();
}

interface Registered extends TestUser {
  token: string;
}

async function signInRegistered(profile = ONBOARDED_PROFILE): Promise<Registered> {
  const user = await signInUser(app, profile);
  const token = madeUpPushToken();
  await registerPushToken(app, user.accessToken, token);
  return { ...user, token };
}

// A Leader and a Friend, both with a registered token, and a Quest of the Leader's.
async function leaderAndFriend(
  title = '저녁 같이',
): Promise<{ leader: Registered; friend: Registered; questId: string }> {
  const [leader, friend] = await Promise.all([
    signInRegistered({ name: '김리더', department: '컴퓨터공학부' }),
    signInRegistered(),
  ]);
  await befriend(app, leader, friend);
  return { leader, friend, questId: await ownQuest(app, leader, { title }) };
}

// An invitation answered well before Expo's 5-second timeout and stored, whatever Expo did with its push.
async function expectInvitationStored(): Promise<void> {
  const { leader, friend, questId } = await leaderAndFriend();
  const started = Date.now();

  expect((await invite(app, leader, questId, friend.id)).status).toBe(204);

  expect(Date.now() - started).toBeLessThan(4000);
  expect((await getInvitations(app, friend)).body).toHaveLength(1);
  await settled();
  expect(expo.requests).toHaveLength(1);
}

// An invitation of a Friend with a registered token, already pushed, with the stand-in emptied.
async function pushedInvitation(): Promise<{ friend: Registered; invitationId: string }> {
  const { leader, friend, questId } = await leaderAndFriend();
  const invitationId = await invitationOf(app, leader, questId, friend);
  await settled();
  expo.reset();
  expo.answers(savedAnswer('expo-push-ok'));
  return { friend, invitationId };
}

describe('Inviting a Friend', () => {
  it('sends one push to the invitee’s token only, with the Leader, the Quest and the invitation’s card', async () => {
    const { leader, friend, questId } = await leaderAndFriend('저녁 같이');

    expect((await invite(app, leader, questId, friend.id)).status).toBe(204);

    await settled();
    const [invitation] = z.array(z.object({ id: z.string() })).parse((await getInvitations(app, friend)).body);
    expect(expo.requests).toEqual([
      {
        url: 'https://exp.host/--/api/v2/push/send',
        method: 'POST',
        accept: 'application/json',
        contentType: 'application/json',
        body: [
          {
            to: friend.token,
            title: '김리더님의 파티 초대',
            body: '저녁 같이',
            data: { url: `/main?card=invitation:${invitation?.id}` },
            channelId: 'default',
            priority: 'high',
          },
        ],
      },
    ]);
  });

  it('sends nothing to an invitee without a token', async () => {
    const [leader, friend] = await Promise.all([signInRegistered(), signInUser(app)]);
    await befriend(app, leader, friend);
    const questId = await ownQuest(app, leader);

    expect((await invite(app, leader, questId, friend.id)).status).toBe(204);

    await settled();
    expect(expo.requests).toEqual([]);
  });

  it('sends nothing to an invitee whose Session ended', async () => {
    const { leader, friend, questId } = await leaderAndFriend();
    expect((await postSignOut(app, friend.accessToken)).status).toBe(204);

    expect((await invite(app, leader, questId, friend.id)).status).toBe(204);

    await settled();
    expect(expo.requests).toEqual([]);
  });
});

describe('A token Expo reports as DeviceNotRegistered', () => {
  it('is deleted, and the next invitation sends nothing', async () => {
    const { leader, friend, questId } = await leaderAndFriend();
    const secondQuestId = await ownQuest(app, leader);
    expo.answers(savedAnswer('expo-push-device-not-registered'));
    expect((await invite(app, leader, questId, friend.id)).status).toBe(204);
    await settled();
    expect(expo.requests).toHaveLength(1);
    expect(logged).toContainEqual(expect.stringMatching(/^Push token [\da-f-]{36} deleted: DeviceNotRegistered$/u));
    expo.reset();

    expect((await invite(app, leader, secondQuestId, friend.id)).status).toBe(204);

    await settled();
    expect(expo.requests).toEqual([]);
    expect(await prisma.pushToken.count({ where: { sessionId: sessionOf(friend.accessToken) } })).toBe(0);
  });

  it('leaves the row of a Session that registered another token before Expo answered', async () => {
    const { leader, friend, questId } = await leaderAndFriend();
    const secondQuestId = await ownQuest(app, leader);
    const answer = expo.holds();
    expect((await invite(app, leader, questId, friend.id)).status).toBe(204);
    await vi.waitFor(() => {
      expect(expo.requests).toHaveLength(1);
    });
    const newToken = madeUpPushToken();
    await registerPushToken(app, friend.accessToken, newToken);

    answer(savedAnswer('expo-push-device-not-registered'));

    await settled();
    expect(
      await prisma.pushToken.findMany({
        where: { sessionId: sessionOf(friend.accessToken) },
        select: { token: true },
      }),
    ).toEqual([{ token: newToken }]);
    expo.reset();
    expo.answers(savedAnswer('expo-push-ok'));
    expect((await invite(app, leader, secondQuestId, friend.id)).status).toBe(204);
    await settled();
    expect(expo.requests.map(({ body }) => body)).toEqual([[expect.objectContaining({ to: newToken })]]);
  });
});

describe('When Expo does not deliver, the invitation still goes through', () => {
  it('as Expo answers 500', async () => {
    expo.answers(
      JSON.stringify({ errors: [{ code: 'INTERNAL_SERVER_ERROR', message: 'An unknown error occurred.' }] }),
      500,
    );

    await expectInvitationStored();
  });

  it('as the request fails', async () => {
    expo.fails(new TypeError('fetch failed'));

    await expectInvitationStored();
  });

  // The send gives Expo up after its 5-second timeout, which the test waits for.
  it('as Expo never answers', { timeout: 15_000 }, async () => {
    expo.hangs();

    await expectInvitationStored();
  });
});

describe('Answering an invitation', () => {
  it('by accepting it sends no push', async () => {
    const { friend, invitationId } = await pushedInvitation();

    expect((await answerInvitation(app, friend, invitationId, 'accept')).status).toBe(201);

    await settled();
    expect(expo.requests).toEqual([]);
  });

  it('by declining it sends no push', async () => {
    const { friend, invitationId } = await pushedInvitation();

    expect((await answerInvitation(app, friend, invitationId, 'decline')).status).toBe(204);

    await settled();
    expect(expo.requests).toEqual([]);
  });
});
