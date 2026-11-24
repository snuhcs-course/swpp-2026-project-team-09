/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, INestApplication, Param, Put } from '@nestjs/common';
import { Server } from 'node:http';
import { z } from 'zod';
import request from 'supertest';
import { inject } from 'vitest';
import { Public } from '../src/common/public.decorator.js';
import { captureLogs } from './assistant.js';
import { captureJsonLines, requestLine, useJsonLogs } from './request-logs.js';
import {
  postRefreshToken,
  postSignIn,
  signIn,
  signInAsNewAdministrator,
  signInResultSchema,
  tokensSchema,
  withAccessToken,
} from './sign-in.js';
import { startApp } from './start-app.js';

// A route that exists only in this test: it answers its body back with the path's ID.
@Public()
@Controller('request-logging-test')
class EchoController {
  @Put(':id')
  echo(@Param('id') id: string, @Body() body: Record<string, unknown>): Record<string, unknown> {
    return { id, ...body };
  }
}

const inviteLinkSchema = z.object({ url: z.string() });

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'), [EchoController]);
  await useJsonLogs(app);
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('The request ID', () => {
  it('every response, a route, a refusal or no route at all → an X-Request-Id, different each time', async () => {
    const server = app.getHttpServer();
    const responses = await Promise.all([
      request(server).get('/health/live'),
      request(server).get('/health/live'),
      request(server).get('/users/me'),
      request(server).get('/no-such-path'),
    ]);

    const ids = responses.map((response) => response.headers['x-request-id']);
    for (const id of ids) {
      expect(id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4/u);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a client's own X-Request-Id → not taken", async () => {
    const response = await request(app.getHttpServer()).get('/health/live').set('X-Request-Id', 'made-up-id');

    expect(response.headers['x-request-id']).not.toBe('made-up-id');
  });
});

describe('The request line', () => {
  it('a request with a body → one info line with the method, the path, the status, the time and both bodies', async () => {
    const { lines } = captureJsonLines();

    const response = await request(app.getHttpServer())
      .put('/request-logging-test/q-1?near=made-up-query-value')
      .send({ title: '점심', password: 'made-up-password' });

    expect(response.status).toBe(200);
    const line = await requestLine(lines, 'PUT /request-logging-test/q-1 ');
    expect(line).toEqual(
      expect.objectContaining({
        level: 'log',
        context: 'HTTP',
        req_id: response.headers['x-request-id'],
        message: expect.stringMatching(/^PUT \/request-logging-test\/q-1 200 \d+ms$/u) as unknown,
        req_body: '{"title":"점심","password":"[masked]"}',
        res_body: '{"id":"q-1","title":"점심","password":"[masked]"}',
      }),
    );
    expect(line).not.toHaveProperty('user_id');
    expect(JSON.stringify(lines())).not.toContain('made-up-query-value');
    expect(JSON.stringify(lines())).not.toContain('made-up-password');
  });
});

describe('Tokens', () => {
  it('a sign-in and a refresh → no token from their answers in any log line', async () => {
    const logs = captureLogs();
    const { lines, text } = captureJsonLines();

    const signedIn = signInResultSchema.parse((await postSignIn(app).expect(200)).body);
    const refreshed = tokensSchema.parse((await postRefreshToken(app, signedIn.refreshToken).expect(200)).body);

    await requestLine(lines, 'POST /auth/google 200');
    const refreshLine = await requestLine(lines, 'POST /auth/refresh 200');
    expect(refreshLine.req_body).toBe('{"refreshToken":"[masked]"}');
    expect(refreshLine.res_body).toBe('{"accessToken":"[masked]","refreshToken":"[masked]"}');
    const tokens = [signedIn.accessToken, signedIn.refreshToken, refreshed.accessToken, refreshed.refreshToken];
    for (const token of tokens) {
      expect(text()).not.toContain(token);
      expect(logs()).not.toContain(token);
    }
  });
});

describe('Which requests leave a line', () => {
  it.each([
    ['a guard refuses it', '/users/me', 'GET /users/me 401'],
    ['no route matches it', '/no-such-path', 'GET /no-such-path 404'],
  ])('a request %s → still one line, with the refusal as its answer', async (_case, path, start) => {
    const { lines } = captureJsonLines();

    await request(app.getHttpServer()).get(path);

    const line = await requestLine(lines, start);
    expect(line.res_body).toEqual(expect.stringContaining(`"statusCode":${start.slice(-3)}`));
  });

  it('the health checks → no line', async () => {
    const { lines } = captureJsonLines();

    await request(app.getHttpServer()).get('/health/live');
    await request(app.getHttpServer()).get('/health/ready');
    await request(app.getHttpServer()).get('/no-such-path');

    await requestLine(lines, 'GET /no-such-path 404');
    expect(lines().filter((line) => line.message.includes('/health/'))).toEqual([]);
  });
});

describe('A body or a path the log must not keep whole', () => {
  it('a JSON body nested 20,000 levels deep → the server answers it and the next request, and logs both', async () => {
    const { lines } = captureJsonLines();

    const deep = await request(app.getHttpServer())
      .put('/no-such-path')
      .set('Content-Type', 'application/json')
      .send(`${'['.repeat(20_000)}${']'.repeat(20_000)}`);
    const next = await request(app.getHttpServer()).get('/health/live');

    expect(deep.status).toBe(404);
    expect(next.status).toBe(200);
    const line = await requestLine(lines, 'PUT /no-such-path 404');
    expect(line.req_body).toEqual(expect.stringContaining('"[…]"'));
  });

  it('an Invite Link made, read and its page opened → its token in no log line, only as [masked]', async () => {
    const { accessToken } = await signIn(app);
    const { lines, text } = captureJsonLines();

    const made = await withAccessToken(request(app.getHttpServer()).post('/invite-links'), accessToken).expect(201);
    const { url } = inviteLinkSchema.parse(made.body);
    const token = url.split('/invite/')[1] ?? '';
    await withAccessToken(request(app.getHttpServer()).get(`/invite-links/${token}`), accessToken);
    await request(app.getHttpServer()).get(`/invite/${token}`);

    await requestLine(lines, 'GET /invite/[masked] ');
    await requestLine(lines, 'GET /invite-links/[masked] ');
    const madeLine = await requestLine(lines, 'POST /invite-links 201');
    expect(madeLine.res_body).toEqual(expect.stringContaining('/invite/[masked]'));
    expect(token.length).toBeGreaterThan(10);
    expect(text()).not.toContain(token);
  });
});

describe('Lines of the same request', () => {
  it("a warning logged inside the handler → the request line's req_id, and the Administrator's ID on both", async () => {
    const { id, accessToken } = await signInAsNewAdministrator(app);
    const { lines } = captureJsonLines();

    const response = await withAccessToken(request(app.getHttpServer()).post('/admin/log-test'), accessToken).send({
      level: 'warn',
    });

    expect(response.status).toBe(204);
    const line = await requestLine(lines, 'POST /admin/log-test 204');
    const warning = lines().find((logged) => logged.level === 'warn' && logged.message.includes(id));
    expect(warning).toEqual(expect.objectContaining({ req_id: response.headers['x-request-id'], user_id: id }));
    expect(line).toEqual(expect.objectContaining({ req_id: response.headers['x-request-id'], user_id: id }));
  });
});
