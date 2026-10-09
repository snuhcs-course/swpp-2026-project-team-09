// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #48
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { signInUser } from './friends.js';
import { postAsMatchServer } from './match-server.js';
import { connectToDatabase, questFor, storeEvent, storeSharedQuest } from './quests.js';
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

const HOUR = 60 * 60 * 1000;

describe('Which requests for Matching still stand', () => {
  it('are those whose Global Event is published and has not started and whose User holds no Shared Quest for it', async () => {
    const [free, alone, sharing, partner] = await Promise.all([1, 2, 3, 4].map(() => signInUser(app)));
    const event = await storeEvent(prisma);
    const withoutStart = await storeEvent(prisma, { startsAt: null, endsAt: null });
    const started = await storeEvent(prisma, { startsAt: new Date(Date.now() - HOUR), endsAt: null });
    const cancelled = await storeEvent(prisma, { state: 'cancelled' });
    const draft = await storeEvent(prisma, { state: 'draft' });
    await questFor(app, alone, event.id);
    await storeSharedQuest(prisma, event, [sharing.id, partner.id]);
    const stands = [
      { userId: free.id, globalEventId: event.id },
      { userId: alone.id, globalEventId: event.id },
      { userId: free.id, globalEventId: withoutStart.id },
    ];
    const standsNot = [
      { userId: sharing.id, globalEventId: event.id },
      { userId: free.id, globalEventId: started.id },
      { userId: free.id, globalEventId: cancelled.id },
      { userId: free.id, globalEventId: draft.id },
      { userId: free.id, globalEventId: randomUUID() },
    ];

    const response = await postAsMatchServer(app, '/matching-requests/standing', {
      requests: [standsNot[0], stands[0], standsNot[1], stands[1], standsNot[2], standsNot[3], stands[2], standsNot[4]],
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ standing: stands });
  });

  it('are none of none', async () => {
    const response = await postAsMatchServer(app, '/matching-requests/standing', { requests: [] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ standing: [] });
  });
});

describe("A call for the match server without the match server's token", () => {
  const routes = [
    '/matching-requests/standing',
    '/matching-requests/eligible-quests',
    '/matching-requests/placements',
    `/matches/${randomUUID()}/quest`,
  ];

  // A route left unmarked would take the User, and one marked @WorkerOnly() the worker: either would answer 400 here.
  it.each(routes)("is refused on %s, with no token, the worker's token and a User's access token", async (path) => {
    const user = await signInUser(app);

    const statuses = await Promise.all(
      [null, inject('settings').WORKER_TOKEN, user.accessToken].map(
        async (token) => (await postAsMatchServer(app, path, {}, token)).status,
      ),
    );

    expect(statuses).toEqual([401, 401, 401]);
  });
});
