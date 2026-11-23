/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { captureLogs } from './assistant.js';
import { removedAdministratorToken, signIn, signInAsAdministrator, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

const LEVELS = ['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const;

// Each line the server's loggers were given from now on, with its level.
function captureLevels(): () => { level: string; message: unknown }[] {
  const spies = LEVELS.map((level) => [level, vi.spyOn(Logger.prototype, level)] as const);
  return () =>
    spies.flatMap(([level, spy]) =>
      spy.mock.calls.map((call) => {
        const [message]: unknown[] = call;
        return { level, message };
      }),
    );
}

function postLogTest(accessToken: string | undefined, body?: object): request.Test {
  const call = withAccessToken(request(app.getHttpServer()).post('/admin/log-test'), accessToken);
  return body === undefined ? call : call.send(body);
}

async function administrator(): Promise<{ id: string; accessToken: string }> {
  const { accessToken } = await signInAsAdministrator(app);
  const me = await request(app.getHttpServer()).get('/admin/auth/me').auth(accessToken, { type: 'bearer' });
  return { id: z.object({ id: z.string() }).parse(me.body).id, accessToken };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("An Administrator's test log line", () => {
  it.each([
    ['info', 'log', 'A test info line from the admin site'],
    ['warn', 'warn', 'A test warning from the admin site'],
    ['error', 'error', 'A test error from the admin site'],
  ])('%s → 204, and exactly one line at %s naming the Administrator by ID', async (level, logged, text) => {
    const { id, accessToken } = await administrator();
    const lines = captureLevels();

    const response = await postLogTest(accessToken, { level });

    expect(response.status).toBe(204);
    expect(lines().filter(({ message }) => String(message).includes(id))).toEqual([
      { level: logged, message: `${text}, by Administrator ${id}` },
    ]);
  });
});

describe('A test log line refused', () => {
  it.each([
    ['no access token', (): undefined => undefined],
    ["a User's access token", async (): Promise<string> => (await signIn(app)).accessToken],
    ['a removed Administrator', (): Promise<string> => removedAdministratorToken(app)],
  ])('with %s → 401, and nothing is logged', async (_case, accessToken) => {
    const token = await accessToken();
    const logs = captureLogs();

    const response = await postLogTest(token, { level: 'warn' });

    expect(response.status).toBe(401);
    expect(logs()).not.toContain('from the admin site');
  });

  it.each([
    ['debug', { level: 'debug' }],
    ['fatal', { level: 'fatal' }],
    ['WARN', { level: 'WARN' }],
    ['a number', { level: 1 }],
    ['no level', {}],
    ['no body', undefined],
  ])('with %s → 400, and nothing is logged', async (_case, body) => {
    const { accessToken } = await administrator();
    const logs = captureLogs();

    const response = await postLogTest(accessToken, body);

    expect(response.status).toBe(400);
    expect(logs()).not.toContain('from the admin site');
  });
});
