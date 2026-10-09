// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
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

const [first, second] = [randomUUID(), randomUUID()];

describe.each([
  ['get', '/admin/users', {}],
  ['get', `/admin/users/${first}/friends`, {}],
  ['post', '/admin/friendships', { userAId: first, userBId: second }],
  ['delete', `/admin/friendships/${first}/${second}`, {}],
] as const)('%s %s', (method, path, body) => {
  it.each([
    ['no access token', (): undefined => undefined],
    ["a User's access token", async (): Promise<string> => (await signIn(app)).accessToken],
    ['a removed Administrator', (): Promise<string> => removedAdministratorToken(app)],
  ])('refuses a request with %s with 401', async (_case, accessToken) => {
    const response = await withAccessToken(request(app.getHttpServer())[method](path), await accessToken()).send(body);

    expect(response.status).toBe(401);
  });
});
