/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { GlobalEventState, PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { signInUser, TestUser } from './friends.js';
import { askForMatching, MatchServerStub } from './match-server.js';
import { patchProfile } from './profile.js';
import { connectToDatabase, questFor, storeEvent, storeSharedQuest } from './quests.js';
import { refused } from './signals.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
const matchServer = new MatchServerStub();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, matchServer.fetch);
  prisma = connectToDatabase();
});

beforeEach(() => {
  matchServer.calls = [];
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// The match server takes the User's request and answers that it waits.
function waits(user: TestUser, globalEventId: string, size: number): object {
  const answer = { globalEventId, size, state: 'waiting', arrivedAt: new Date().toISOString(), questId: null };
  matchServer.answers('POST', `/users/${user.id}/matching-requests`, 201, answer);
  return answer;
}

describe('Asking for Matching', () => {
  it('passes the User, the Global Event, the size and the hashtags on, and answers that the request waits', async () => {
    const user = await signInUser(app);
    await patchProfile(app, user.accessToken, { hashtags: ['보드게임', 'jazz'] });
    const event = await storeEvent(prisma);
    const answer = waits(user, event.id, 3);

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 3 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(answer);
    expect(matchServer.calls).toEqual([
      {
        method: 'POST',
        path: `/users/${user.id}/matching-requests`,
        body: { globalEventId: event.id, size: 3, hashtags: ['보드게임', 'jazz'] },
        authorization: `Bearer ${inject('settings').MATCH_SERVER_TOKEN}`,
      },
    ]);
  });

  it('is open to a User who holds a Quest for the Global Event alone', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    await questFor(app, user, event.id);
    waits(user, event.id, 2);

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 2 });

    expect(response.status).toBe(201);
  });

  it('is open for a published Global Event without a start time', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma, { startsAt: null, endsAt: null });
    waits(user, event.id, 4);

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 4 });

    expect(response.status).toBe(201);
  });
});

describe('A second request for Matching on a Global Event', () => {
  it('is refused as the match server refuses it while the first waits', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    matchServer.refuses('POST', `/users/${user.id}/matching-requests`, 409, 'MATCHING_REQUEST_WAITING');

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'MATCHING_REQUEST_WAITING'));
  });
});

describe('Asking for Matching on a Global Event that cannot be asked for', () => {
  it('is refused for an unknown Global Event, and the match server is not asked', async () => {
    const user = await signInUser(app);

    const response = await askForMatching(app, user, { globalEventId: randomUUID(), size: 2 });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'GLOBAL_EVENT_NOT_FOUND'));
    expect(matchServer.calls).toEqual([]);
  });

  it.each<GlobalEventState>(['draft', 'cancelled', 'discarded'])('is refused for a Global Event %s', async (state) => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma, { state });

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 2 });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject(refused(404, 'GLOBAL_EVENT_NOT_FOUND'));
    expect(matchServer.calls).toEqual([]);
  });

  it.each([
    ['an hour ago', -60 * 60 * 1000],
    ['at this moment', 0],
  ])('is refused for a Global Event that started %s', async (_, offset) => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date((event.startsAt?.getTime() ?? 0) - offset));

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'GLOBAL_EVENT_STARTED'));
    expect(matchServer.calls).toEqual([]);
  });
});

describe('Asking for Matching with a size outside 2 to 4', () => {
  it.each([1, 5, 0])('is refused with a size of %s', async (size) => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);

    const response = await askForMatching(app, user, { globalEventId: event.id, size });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject(refused(400, 'MATCHING_SIZE_OUT_OF_RANGE'));
    expect(matchServer.calls).toEqual([]);
  });

  it('is refused with a size that is not a whole number', async () => {
    const user = await signInUser(app);
    const event = await storeEvent(prisma);

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 2.5 });

    expect(response.status).toBe(400);
    expect(matchServer.calls).toEqual([]);
  });
});

describe('Asking for Matching while holding a Shared Quest for the Global Event', () => {
  it('is refused, and the match server is not asked', async () => {
    const [user, other] = await Promise.all([signInUser(app), signInUser(app)]);
    const event = await storeEvent(prisma);
    await storeSharedQuest(prisma, event, [user.id, other.id]);

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject(refused(409, 'SHARED_QUEST_HELD'));
    expect(matchServer.calls).toEqual([]);
  });
});
