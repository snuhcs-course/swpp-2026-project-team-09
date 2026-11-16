/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type FriendLevel } from '../src/generated/prisma/client.js';
import { IN_LIBRARY, placeNumbered, recordAsked } from './friend-levels.js';
import { befriend, getFriends, signInUser, type TestUser } from './friends.js';
import { expectStatus, setMasterSwitch, shareAt, uploadPosition } from './location-sharing.js';
import { withAccessToken } from './sign-in.js';
import { ANY_STRING, refused, type SignalEvent, SignalWatcher, signalsWhile } from './signals.js';
import { startApp } from './start-app.js';

// Asking once: when the app asked a User about each Friend and about the Master Switch, the lowering of every Friend
// that the Master Switch's question offers, and that nothing of a question reaches the other User. Signals are read by
// the Users of each test only, since other files share the Redis.

const settings = inject('settings');
let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(settings), SignalWatcher.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

function recordMasterAsked(user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/users/me/master-switch/asked'), user.accessToken);
}

function lowerAll(user: TestUser, body: object): request.Test {
  return withAccessToken(request(app.getHttpServer()).put('/users/me/friend-levels'), user.accessToken).send(body);
}

function postLobby(user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/lobby'), user.accessToken);
}

const friendSchema = z.object({ id: z.string(), level: z.string(), askedOff: z.boolean(), askedPlan: z.boolean() });

// Each Friend of the User by their id, with the User's end and what the User was asked about them.
async function endsOf(user: TestUser): Promise<Record<string, object>> {
  const friends = z.array(friendSchema).parse((await expectStatus(getFriends(app, user), 200)).body);
  return Object.fromEntries(friends.map(({ id, level, askedOff, askedPlan }) => [id, { level, askedOff, askedPlan }]));
}

const end = (level: FriendLevel, askedOff = false, askedPlan = false): object => ({ level, askedOff, askedPlan });

// The signals of any name that reached these Users while `act` ran.
async function reachingWhile(users: TestUser[], act: () => Promise<unknown>): Promise<SignalEvent[]> {
  const sent = await signalsWhile(app, watcher, null, act);
  return sent.filter(({ userIds }) => users.some(({ id }) => userIds?.includes(id) === true));
}

async function twoFriends(): Promise<[TestUser, TestUser]> {
  const [user, friend] = await Promise.all([signInUser(app), signInUser(app)]);
  await befriend(app, user, friend);
  return [user, friend];
}

async function userWithThreeFriends(): Promise<[TestUser, TestUser, TestUser, TestUser]> {
  const [user, one, two, three] = await Promise.all([
    signInUser(app),
    signInUser(app),
    signInUser(app),
    signInUser(app),
  ]);
  await Promise.all([one, two, three].map((friend) => befriend(app, user, friend)));
  return [user, one, two, three];
}

describe('A new friendship and a new User', () => {
  it('have not been asked anything', async () => {
    const [user, friend] = await twoFriends();

    expect(await endsOf(user)).toEqual({ [friend.id]: end('building') });
    expect((await expectStatus(postLobby(user), 200)).body).toMatchObject({ masterOffAsked: false });
  });
});

describe('POST /friends/asked', () => {
  it.each([
    ['off', true, false],
    ['plan', false, true],
  ] as const)(
    "records the moment %s at the User's own end for each Friend named, and tells nobody",
    async (moment, askedOff, askedPlan) => {
      const [user, one, two, other] = await userWithThreeFriends();

      const reaching = await reachingWhile([user, one, two, other], async () => {
        expect((await recordAsked(app, user, { userIds: [one.id, two.id], moment })).status).toBe(204);
      });

      expect(await endsOf(user)).toEqual({
        [one.id]: end('building', askedOff, askedPlan),
        [two.id]: end('building', askedOff, askedPlan),
        [other.id]: end('building'),
      });
      expect(await endsOf(one)).toEqual({ [user.id]: end('building') });
      expect(reaching).toEqual([]);
    },
  );

  it('refuses a User who is no Friend with 404 FRIEND_NOT_FOUND, and records nothing', async () => {
    const [user, friend] = await twoFriends();
    const stranger = await signInUser(app);

    const response = await recordAsked(app, user, { userIds: [friend.id, stranger.id], moment: 'off' });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'FRIEND_NOT_FOUND'));
    expect(await endsOf(user)).toEqual({ [friend.id]: end('building') });
  });

  it.each([
    ['no Friend', { userIds: [], moment: 'off' }],
    ['a moment that is none', { userIds: [randomUUID()], moment: 'later' }],
    ['an id that is no UUID', { userIds: ['민수'], moment: 'plan' }],
    ['a field more', { userIds: [randomUUID()], moment: 'off', level: 'building' }],
  ])('refuses %s with 400', async (_case, body) => {
    const user = await signInUser(app);

    expect((await recordAsked(app, user, body)).status).toBe(400);
  });
});

describe('POST /users/me/master-switch/asked', () => {
  it('records that the Master Switch was asked about, leaves the switch as it is, and tells nobody', async () => {
    const [user, friend] = await twoFriends();
    await expectStatus(setMasterSwitch(app, user, true), 204);

    const reaching = await reachingWhile([user, friend], async () => {
      expect((await recordMasterAsked(user)).status).toBe(204);
    });

    expect((await expectStatus(postLobby(user), 200)).body).toMatchObject({ masterSwitch: true, masterOffAsked: true });
    expect((await expectStatus(postLobby(friend), 200)).body).toMatchObject({ masterOffAsked: false });
    expect(reaching).toEqual([]);
  });
});

describe('PUT /users/me/friend-levels', () => {
  it("lowers every Friend above the level to it at the User's end, and tells each Friend what their map shows", async () => {
    const [user, atExact, atBuilding, atTimetable] = await userWithThreeFriends();
    await shareAt(app, user, atExact, 'exact');
    await shareAt(app, user, atBuilding, 'building');
    await shareAt(app, user, atTimetable, 'timetable');
    await expectStatus(uploadPosition(app, user, IN_LIBRARY), 200);
    const { id: placeId, latitude, longitude } = await placeNumbered(app, user, '62');

    const reaching = await reachingWhile([atExact, atBuilding, atTimetable], async () => {
      expect((await lowerAll(user, { level: 'building' })).status).toBe(204);
    });

    expect(await endsOf(user)).toEqual({
      [atExact.id]: end('building'),
      [atBuilding.id]: end('building'),
      [atTimetable.id]: end('timetable'),
    });
    expect(await endsOf(atExact)).toEqual({ [user.id]: end('exact') });
    expect(reaching).toEqual([
      {
        userIds: [atExact.id],
        name: 'position',
        payload: { userId: user.id, placeId, latitude, longitude, measuredAt: ANY_STRING, level: 'building' },
      },
    ]);
  });

  it.each([
    ['a level that is none', { level: 'college' }],
    ['no level', {}],
    ['a field more', { level: 'building', asked: true }],
  ])('refuses %s with 400', async (_case, body) => {
    const [user, friend] = await twoFriends();
    await shareAt(app, user, friend, 'exact');

    expect((await lowerAll(user, body)).status).toBe(400);
    expect(await endsOf(user)).toEqual({ [friend.id]: end('exact') });
  });
});
