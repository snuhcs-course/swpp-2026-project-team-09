/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { signIn, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

const id = randomUUID();

describe.each([
  ['post', '/admin/global-events', { title: '동아리 박람회', description: '' }],
  ['patch', `/admin/global-events/${id}`, { version: 1, title: '동아리 박람회' }],
  ['post', `/admin/global-events/${id}/publish`, { version: 1 }],
  ['post', `/admin/global-events/${id}/discard`, { version: 1 }],
  ['post', `/admin/global-events/${id}/cancel`, { version: 1 }],
] as const)('%s %s', (method, path, body) => {
  it.each([
    ['no access token', (): undefined => undefined],
    ["a User's access token", async (): Promise<string> => (await signIn(app)).accessToken],
  ])('refuses a request with %s with 401', async (_case, accessToken) => {
    const response = await withAccessToken(request(app.getHttpServer())[method](path), await accessToken())
      .set('Idempotency-Key', randomUUID())
      .send(body);

    expect(response.status).toBe(401);
  });
});
