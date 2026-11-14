/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { type PushService } from '../src/push/push.service.js';
import { ExpoPushStub, madeUpPushToken, pushServiceOf, putPushToken, registerPushToken } from './expo-push.js';
import { befriend, signInUser, TestUser } from './friends.js';
import { googleSubject } from './google.js';
import { getProfile } from './profile.js';
import { invite } from './quest-recruiting.js';
import { connectToDatabase, ownQuest } from './quests.js';
import { getMe, postRefreshToken, postSignOut, refresh, sessionOf, signIn, useLongAgo } from './sign-in.js';
import { startApp } from './start-app.js';
import { savedAnswer } from './walking-route.js';

const expo = new ExpoPushStub();
let app: INestApplication<Server>;
let prisma: PrismaClient;
let push: PushService;

beforeAll(async () => {
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
  expo.reset();
  expo.answers(savedAnswer('expo-push-ok'));
});

interface Subject extends TestUser {
  sub: string;
  refreshToken: string;
  sessionId: string;
}

// A User signed in with a Google account that the test can sign in with again.
async function signInSubject(): Promise<Subject> {
  const sub = googleSubject();
  const { accessToken, refreshToken } = await signIn(app, { sub });
  const { id } = z.object({ id: z.string() }).parse((await getMe(app, accessToken)).body);
  const { friendId } = z.object({ friendId: z.string() }).parse((await getProfile(app, accessToken)).body);
  return { id, friendId, accessToken, refreshToken, sub, sessionId: sessionOf(accessToken) };
}

// A Subject with a registered token and a Friend who leads a Quest.
async function registeredInvitee(): Promise<{ subject: Subject; token: string; leader: TestUser; questId: string }> {
  const [subject, leader] = await Promise.all([signInSubject(), signInUser(app)]);
  await befriend(app, leader, subject);
  const token = madeUpPushToken();
  await registerPushToken(app, subject.accessToken, token);
  return { subject, token, leader, questId: await ownQuest(app, leader) };
}

function tokensOfSession(sessionId: string): Promise<string[]> {
  return prisma.pushToken.findMany({ where: { sessionId } }).then((rows) => rows.map(({ token }) => token));
}

async function sentAfterInviting(leader: TestUser, questId: string, invitee: TestUser): Promise<number> {
  expect((await invite(app, leader, questId, invitee.id)).status).toBe(204);
  await push.settled();
  return expo.requests.length;
}

describe('Registering a push token', () => {
  it('stores it for the Session and answers 204', async () => {
    const user = await signInUser(app);
    const token = madeUpPushToken();

    const response = await putPushToken(app, user.accessToken, { token });

    expect(response.status).toBe(204);
    expect(await tokensOfSession(sessionOf(user.accessToken))).toEqual([token]);
  });

  it('a second time from the same Session replaces the first token', async () => {
    const user = await signInUser(app);
    const second = madeUpPushToken();
    await registerPushToken(app, user.accessToken, madeUpPushToken());

    await registerPushToken(app, user.accessToken, second);

    expect(await tokensOfSession(sessionOf(user.accessToken))).toEqual([second]);
  });

  it('accepts the shorter form of an Expo push token', async () => {
    const user = await signInUser(app);

    expect((await putPushToken(app, user.accessToken, { token: 'ExpoPushToken[abc-123]' })).status).toBe(204);
  });

  it('moves a token another User’s Session registered, so that inviting the first User sends nothing', async () => {
    const { subject, token, leader, questId } = await registeredInvitee();
    const nextUser = await signInUser(app);

    await registerPushToken(app, nextUser.accessToken, token);

    expect(await tokensOfSession(subject.sessionId)).toEqual([]);
    expect(await tokensOfSession(sessionOf(nextUser.accessToken))).toEqual([token]);
    expect(await sentAfterInviting(leader, questId, subject)).toBe(0);
  });
});

describe('A registration is refused', () => {
  it.each([
    ['a token of another form', { token: 'fcm:abcdef' }],
    ['an empty token', { token: 'ExponentPushToken[]' }],
    ['a token with a space', { token: 'ExponentPushToken[ab cd]' }],
    ['a token that is too long', { token: `ExponentPushToken[${'a'.repeat(181)}]` }],
    ['no token', {}],
    ['another field', { token: 'ExponentPushToken[abc]', userId: 'someone' }],
  ])('with 400 for %s', async (_name, body) => {
    const user = await signInUser(app);

    expect((await putPushToken(app, user.accessToken, body)).status).toBe(400);
    expect(await tokensOfSession(sessionOf(user.accessToken))).toEqual([]);
  });

  it('with 401 without a sign-in', async () => {
    expect((await putPushToken(app, undefined, { token: madeUpPushToken() })).status).toBe(401);
  });
});

describe('The token of a Session that ends', () => {
  it('is deleted by a sign-out', async () => {
    const { subject } = await registeredInvitee();

    expect((await postSignOut(app, subject.accessToken)).status).toBe(204);

    expect(await tokensOfSession(subject.sessionId)).toEqual([]);
  });

  it('is deleted by a sign-in on another phone', async () => {
    const { subject } = await registeredInvitee();

    await signIn(app, { sub: subject.sub });

    expect(await tokensOfSession(subject.sessionId)).toEqual([]);
  });

  it('is deleted by a used refresh token that comes back', async () => {
    const { subject } = await registeredInvitee();
    await refresh(app, subject.refreshToken);
    await useLongAgo(prisma, subject.refreshToken);

    expect((await postRefreshToken(app, subject.refreshToken)).status).toBe(401);

    expect(await tokensOfSession(subject.sessionId)).toEqual([]);
  });

  it('stays through a refresh that keeps the Session', async () => {
    const { subject, token } = await registeredInvitee();

    await refresh(app, subject.refreshToken);

    expect(await tokensOfSession(subject.sessionId)).toEqual([token]);
  });
});

describe('The token of a Session whose only refresh token has expired', () => {
  it('gets no push, though its row stays', async () => {
    const { subject, token, leader, questId } = await registeredInvitee();
    await prisma.refreshToken.updateMany({
      where: { sessionId: subject.sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await sentAfterInviting(leader, questId, subject)).toBe(0);
    expect(await tokensOfSession(subject.sessionId)).toEqual([token]);
  });
});
