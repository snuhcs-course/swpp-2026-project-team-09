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
import { removedAdministratorToken, signIn, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

describe.each([
  '/admin/global-events?state=draft',
  '/admin/global-events?state=published',
  `/admin/global-events/${randomUUID()}`,
  '/admin/places',
  '/admin/collection-statuses',
])('GET %s', (path) => {
  it.each([
    ['no access token', (): undefined => undefined],
    ["a User's access token", async (): Promise<string> => (await signIn(app)).accessToken],
    ['a removed Administrator', (): Promise<string> => removedAdministratorToken(app)],
  ])('refuses a request with %s with 401', async (_case, accessToken) => {
    const response = await withAccessToken(request(app.getHttpServer()).get(path), await accessToken());

    expect(response.status).toBe(401);
  });
});
