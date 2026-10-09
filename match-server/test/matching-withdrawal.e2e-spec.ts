/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { MatchingRequestState, PrismaClient } from '../src/generated/prisma/client.js';
import { ANY_STRING, ask, connectToDatabase, openRequests, readRequest, withdraw } from './main-server.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// A request of a new User for a new Global Event, put in `state`.
async function requestIn(state: MatchingRequestState): Promise<{ userId: string; globalEventId: string }> {
  const [userId, globalEventId] = [randomUUID(), randomUUID()];
  const response = await ask(app, userId, { globalEventId, size: 2, hashtags: [] });
  if (response.status !== 201) {
    throw new Error(`Asking answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  await prisma.matchingRequest.updateMany({ where: { userId, globalEventId }, data: { state } });
  return { userId, globalEventId };
}

describe('Withdrawing a waiting request', () => {
  it('makes it withdrawn and no longer open', async () => {
    const { userId, globalEventId } = await requestIn('waiting');

    const response = await withdraw(app, userId, globalEventId);

    expect(response.status).toBe(204);
    expect((await readRequest(app, userId, globalEventId)).body).toMatchObject({ state: 'withdrawn' });
    expect((await openRequests(app, userId)).body).toEqual([]);
  });
});

describe('Withdrawing a request that does not wait', () => {
  it.each<MatchingRequestState>(['matched', 'withdrawn', 'expired'])(
    'is refused for a request %s, which stays so',
    async (state) => {
      const { userId, globalEventId } = await requestIn(state);

      const response = await withdraw(app, userId, globalEventId);

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ statusCode: 409, code: 'MATCHING_REQUEST_NOT_WAITING' });
      expect((await readRequest(app, userId, globalEventId)).body).toMatchObject({ state });
    },
  );

  it('is refused when the User never asked', async () => {
    const response = await withdraw(app, randomUUID(), randomUUID());

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ statusCode: 404, code: 'MATCHING_REQUEST_NOT_FOUND' });
  });
});

describe('The state of a request', () => {
  it.each<MatchingRequestState>(['waiting', 'matched', 'withdrawn', 'expired'])('reads %s', async (state) => {
    const { userId, globalEventId } = await requestIn(state);

    const response = await readRequest(app, userId, globalEventId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ globalEventId, size: 2, state, arrivedAt: ANY_STRING, questId: null });
  });

  it('is none for a Global Event the User did not ask for', async () => {
    const { userId } = await requestIn('waiting');

    const response = await readRequest(app, userId, randomUUID());

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ statusCode: 404, code: 'MATCHING_REQUEST_NOT_FOUND' });
  });
});
