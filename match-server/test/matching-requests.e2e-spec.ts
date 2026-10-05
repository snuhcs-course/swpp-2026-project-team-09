import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
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

describe('A request for Matching', () => {
  it('is stored as waiting, with the time it arrived', async () => {
    const [userId, globalEventId] = [randomUUID(), randomUUID()];

    const response = await ask(app, userId, { globalEventId, size: 3, hashtags: ['보드게임', 'jazz'] });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ globalEventId, size: 3, state: 'waiting', arrivedAt: ANY_STRING });
    const { arrivedAt } = z.object({ arrivedAt: z.iso.datetime() }).parse(response.body);
    expect(Math.abs(Date.parse(arrivedAt) - Date.now())).toBeLessThan(5000);
    expect((await readRequest(app, userId, globalEventId)).body).toEqual(response.body);
  });

  it('keeps the hashtags for grouping', async () => {
    const [userId, globalEventId] = [randomUUID(), randomUUID()];

    await ask(app, userId, { globalEventId, size: 2, hashtags: ['보드게임', 'jazz'] });

    const stored = await prisma.matchingRequest.findFirst({ where: { userId, globalEventId } });
    expect(stored?.hashtags).toEqual(['보드게임', 'jazz']);
  });

  it.each([1, 5, 2.5])('is refused with a size of %s', async (size) => {
    const response = await ask(app, randomUUID(), { globalEventId: randomUUID(), size, hashtags: [] });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: [expect.stringMatching(/^size: /u)] });
  });
});

describe('A second request for the same Global Event', () => {
  it('is refused while the first waits', async () => {
    const [userId, globalEventId] = [randomUUID(), randomUUID()];
    await ask(app, userId, { globalEventId, size: 2, hashtags: [] });

    const response = await ask(app, userId, { globalEventId, size: 4, hashtags: [] });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ statusCode: 409, code: 'MATCHING_REQUEST_WAITING' });
    expect((await readRequest(app, userId, globalEventId)).body).toMatchObject({ size: 2 });
  });

  it('is stored once when two arrive at the same moment', async () => {
    const [userId, globalEventId] = [randomUUID(), randomUUID()];

    const responses = await Promise.all([
      ask(app, userId, { globalEventId, size: 2, hashtags: [] }),
      ask(app, userId, { globalEventId, size: 3, hashtags: [] }),
    ]);

    expect(responses.map(({ status }) => status).toSorted((a, b) => a - b)).toEqual([201, 409]);
    expect((await openRequests(app, userId)).body).toHaveLength(1);
  });

  it('is taken once the first was withdrawn, and is then the one read', async () => {
    const [userId, globalEventId] = [randomUUID(), randomUUID()];
    await ask(app, userId, { globalEventId, size: 2, hashtags: [] });
    await withdraw(app, userId, globalEventId);

    const response = await ask(app, userId, { globalEventId, size: 3, hashtags: [] });

    expect(response.status).toBe(201);
    expect((await readRequest(app, userId, globalEventId)).body).toMatchObject({ size: 3, state: 'waiting' });
  });

  it("does not stand in another User's way, nor in the way of the User's request for another event", async () => {
    const [userId, otherUserId, globalEventId] = [randomUUID(), randomUUID(), randomUUID()];
    await ask(app, userId, { globalEventId, size: 2, hashtags: [] });

    const other = await ask(app, otherUserId, { globalEventId, size: 2, hashtags: [] });
    const otherEvent = await ask(app, userId, { globalEventId: randomUUID(), size: 2, hashtags: [] });

    expect([other.status, otherEvent.status]).toEqual([201, 201]);
  });
});

describe("A User's open requests", () => {
  it('are the waiting ones, in the order they arrived', async () => {
    const userId = randomUUID();
    const [first, withdrawn, second] = [randomUUID(), randomUUID(), randomUUID()];
    // One after another, so that they arrive in this order.
    await ask(app, userId, { globalEventId: first, size: 2, hashtags: [] });
    await ask(app, userId, { globalEventId: withdrawn, size: 2, hashtags: [] });
    await ask(app, userId, { globalEventId: second, size: 2, hashtags: [] });
    await withdraw(app, userId, withdrawn);
    await ask(app, randomUUID(), { globalEventId: first, size: 2, hashtags: [] });

    const response = await openRequests(app, userId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { globalEventId: first, size: 2, state: 'waiting', arrivedAt: ANY_STRING },
      { globalEventId: second, size: 2, state: 'waiting', arrivedAt: ANY_STRING },
    ]);
  });

  it('are none for a User who never asked', async () => {
    const response = await openRequests(app, randomUUID());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
