/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  INestApplication,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { Public } from '../src/common/public.decorator.js';
import { captureJsonLines, linesOf, requestLine, useJsonLogs } from './request-logs.js';
import { startApp } from './start-app.js';

// Routes that exist only in this test, each failing in its own way.
@Public()
@Controller('errors-test')
class FailingController {
  @Get('bad-request')
  badRequest(): never {
    throw new BadRequestException('The made-up field is missing.');
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundException();
  }

  @Get('too-many')
  tooMany(): never {
    throw new HttpException(
      { statusCode: HttpStatus.TOO_MANY_REQUESTS, code: 'MADE_UP_LIMIT', message: 'Too many made-up requests.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  @Get('unexpected')
  unexpected(): never {
    throw new TypeError("Cannot read properties of undefined (reading 'startAt')");
  }

  @Post('unexpected')
  unexpectedWithBody(@Body() body: { title: string }): never {
    throw new TypeError(`Cannot read properties of undefined (reading '${body.title.length > 0 ? 'startAt' : ''}')`);
  }

  @Get('not-an-error')
  notAnError(): never {
    // oxlint-disable-next-line no-throw-literal, typescript/only-throw-error -- a library may throw something that is not an Error
    throw 'a made-up failure';
  }
}

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'), [FailingController]);
  await useJsonLogs(app);
});

afterAll(async () => {
  await app.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('A response the code throws on purpose', () => {
  it.each([
    [
      'a 400',
      '/errors-test/bad-request',
      400,
      { statusCode: 400, error: 'Bad Request', message: 'The made-up field is missing.' },
    ],
    ['a 404', '/errors-test/not-found', 404, { statusCode: 404, message: 'Not Found' }],
    [
      'a 429',
      '/errors-test/too-many',
      429,
      { statusCode: 429, code: 'MADE_UP_LIMIT', message: 'Too many made-up requests.' },
    ],
    [
      'a path no route matches',
      '/errors-test/none',
      404,
      { statusCode: 404, error: 'Not Found', message: 'Cannot GET /errors-test/none' },
    ],
  ])(
    '%s → answered as NestJS answers it, and one info line with that answer as its body',
    async (_case, path, status, body) => {
      const { lines } = captureJsonLines();

      const response = await request(app.getHttpServer()).get(path);

      expect(response.status).toBe(status);
      expect(response.body).toEqual(body);
      const line = await requestLine(lines, `GET ${path} ${status}`);
      expect(JSON.parse(String(line.res_body))).toEqual(body);
      expect(await linesOf(lines, response.headers['x-request-id'])).toEqual([line]);
    },
  );
});

describe('An error no handler expected', () => {
  it('→ 500 with the request ID, and one error line with the method, the path, the error and its whole stack', async () => {
    const { lines } = captureJsonLines();

    const response = await request(app.getHttpServer()).get('/errors-test/unexpected?near=made-up-query-value');

    const reqId = response.headers['x-request-id'];
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ statusCode: 500, message: 'Internal server error', requestId: reqId });
    // The error line is the request's only line: no request line besides it.
    expect(await linesOf(lines, reqId)).toEqual([
      expect.objectContaining({
        context: 'HTTP',
        req_id: reqId,
        message: expect.stringMatching(
          /^GET \/errors-test\/unexpected 500 \d+ms - TypeError: Cannot read properties of undefined \(reading 'startAt'\)$/u,
        ) as unknown,
        stack: expect.stringMatching(
          /^TypeError: Cannot read properties[^\n]*\n\s+at FailingController\.unexpected/u,
        ) as unknown,
      }),
    ]);
    expect(JSON.stringify(lines())).not.toContain('made-up-query-value');
  });
});

describe('An error no handler expected, of another shape', () => {
  it('something thrown that is not an Error → 500 with the request ID, and one error line naming it', async () => {
    const { lines } = captureJsonLines();

    const response = await request(app.getHttpServer()).get('/errors-test/not-an-error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
      requestId: response.headers['x-request-id'],
    });
    expect(await linesOf(lines, response.headers['x-request-id'])).toEqual([
      expect.objectContaining({
        level: 'error',
        message: expect.stringMatching(/ 500 \d+ms - a made-up failure$/u) as unknown,
      }),
    ]);
  });

  it("with a body → the error line holds the request's body, masked, and no response body", async () => {
    const { lines } = captureJsonLines();

    const response = await request(app.getHttpServer())
      .post('/errors-test/unexpected')
      .send({ title: '점심', password: 'made-up-password' });

    expect(response.status).toBe(500);
    const [line, ...others] = await linesOf(lines, response.headers['x-request-id']);
    expect(others).toEqual([]);
    expect(line).toEqual(
      expect.objectContaining({ level: 'error', req_body: '{"title":"점심","password":"[masked]"}' }),
    );
    expect(line).not.toHaveProperty('res_body');
  });
});
