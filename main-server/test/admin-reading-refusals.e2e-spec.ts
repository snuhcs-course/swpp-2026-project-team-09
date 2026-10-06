import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { signIn, signInAsAdministrator, signInAsNewAdministrator, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

// An Administrator removed after signing in, whose access token has not expired.
async function removedAdministratorToken(): Promise<string> {
  const removed = await signInAsNewAdministrator(app);
  const { accessToken } = await signInAsAdministrator(app);
  await request(app.getHttpServer())
    .delete(`/admin/administrators/${removed.id}`)
    .auth(accessToken, { type: 'bearer' });
  return removed.accessToken;
}

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
    ['a removed Administrator', removedAdministratorToken],
  ])('refuses a request with %s with 401', async (_case, accessToken) => {
    const response = await withAccessToken(request(app.getHttpServer()).get(path), await accessToken());

    expect(response.status).toBe(401);
  });
});
