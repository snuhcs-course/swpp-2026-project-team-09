// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #45
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { asMainServer, openRequests } from './main-server.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

describe("A call without the main server's token", () => {
  const userId = randomUUID();
  const globalEventId = randomUUID();
  const routes: [string, () => request.Test][] = [
    ['asking', () => request(app.getHttpServer()).post(`/users/${userId}/matching-requests`)],
    [
      'withdrawing',
      () => request(app.getHttpServer()).post(`/users/${userId}/matching-requests/${globalEventId}/withdraw`),
    ],
    [
      'reading a request',
      () => request(app.getHttpServer()).get(`/users/${userId}/matching-requests/${globalEventId}`),
    ],
    ['reading the open requests', () => request(app.getHttpServer()).get(`/users/${userId}/matching-requests`)],
  ];

  it.each(routes)('is refused on %s, with no token and with another token', async (_, call) => {
    const withoutToken = await asMainServer(call(), null);
    const withAnother = await asMainServer(call(), 'not-the-token-that-the-two-servers-share');

    expect([withoutToken.status, withAnother.status]).toEqual([401, 401]);
  });

  it('stores nothing when it asks', async () => {
    await asMainServer(request(app.getHttpServer()).post(`/users/${userId}/matching-requests`), null).send({
      globalEventId,
      size: 2,
      hashtags: [],
    });

    expect((await openRequests(app, userId)).body).toEqual([]);
  });
});
