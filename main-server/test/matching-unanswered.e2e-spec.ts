/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser, TestUser } from './friends.js';
import { askForMatching, getMatchingRequest, MatchServerStub, withdrawMatching } from './match-server.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
// A User of their own for each test, so that the match server's answers to one test's paths reach no other.
let user: TestUser;
const matchServer = new MatchServerStub();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, matchServer.fetch);
  prisma = connectToDatabase();
});

beforeEach(async () => {
  user = await signInUser(app);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const failed = { statusCode: 502, error: 'Bad Gateway', message: 'The match server did not answer.' };

describe('A request for Matching that the match server does not take', () => {
  it('is answered 502 when the match server cannot be reached, and logged with the reason', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn');
    const event = await storeEvent(prisma);

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 2 });

    expect(response.status).toBe(502);
    expect(response.body).toEqual(failed);
    expect(warn).toHaveBeenCalledWith(
      `The match server did not answer POST /users/${user.id}/matching-requests: Error: The test gave the match server no answer`,
    );
  });

  it('is answered 502 when the match server has not answered within 5 seconds', async () => {
    // The test waits 10 ms in place of the 5 seconds.
    const timeoutAfter = AbortSignal.timeout.bind(AbortSignal);
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => timeoutAfter(10));
    const event = await storeEvent(prisma);
    matchServer.hangs('POST', `/users/${user.id}/matching-requests`);

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 2 });

    expect(timeout).toHaveBeenCalledWith(5000);
    expect(response.status).toBe(502);
    expect(response.body).toEqual(failed);
  });

  it.each([
    ['an error', 500, { statusCode: 500, message: 'Internal server error' }],
    ['a refusal of the token', 401, { statusCode: 401, message: 'Unauthorized' }],
    ['an answer of another shape', 201, { state: 'waiting' }],
  ])('is answered 502 when the match server answers with %s', async (_, status, body) => {
    const event = await storeEvent(prisma);
    matchServer.answers('POST', `/users/${user.id}/matching-requests`, status, body);

    const response = await askForMatching(app, user, { globalEventId: event.id, size: 2 });

    expect(response.status).toBe(502);
    expect(response.body).toEqual(failed);
  });
});

describe('Reading or withdrawing a request when the match server cannot be reached', () => {
  it('is answered 502', async () => {
    const event = await storeEvent(prisma);

    const read = await getMatchingRequest(app, user, event.id);
    const withdrawn = await withdrawMatching(app, user, event.id);

    expect([read.status, withdrawn.status]).toEqual([502, 502]);
  });
});
