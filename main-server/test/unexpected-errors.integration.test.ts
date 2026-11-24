/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { Public } from '../src/common/public.decorator.js';
import { captureJsonLines, requestLine, useJsonLogs } from './request-logs.js';
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
  ])('%s → answered as NestJS answers it, and no error line', async (_case, path, status, body) => {
    const { lines } = captureJsonLines();

    const response = await request(app.getHttpServer()).get(path);

    expect(response.status).toBe(status);
    expect(response.body).toEqual(body);
    await requestLine(lines, `GET ${path} ${status}`);
    expect(lines().filter((line) => line.level === 'error')).toEqual([]);
  });
});

describe('An error no handler expected', () => {
  it('→ 500 with the request ID, and one error line with the method, the path, the error and its whole stack', async () => {
    const { lines } = captureJsonLines();

    const response = await request(app.getHttpServer()).get('/errors-test/unexpected?near=made-up-query-value');

    const reqId = response.headers['x-request-id'];
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ statusCode: 500, message: 'Internal server error', requestId: reqId });
    await requestLine(lines, 'GET /errors-test/unexpected 500');
    const errors = lines().filter((line) => line.level === 'error');
    expect(errors).toEqual([
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

  it('something thrown that is not an Error → 500 with the request ID, and one error line naming it', async () => {
    const { lines } = captureJsonLines();

    const response = await request(app.getHttpServer()).get('/errors-test/not-an-error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
      requestId: response.headers['x-request-id'],
    });
    await requestLine(lines, 'GET /errors-test/not-an-error 500');
    expect(lines().filter((line) => line.level === 'error')).toEqual([
      expect.objectContaining({ message: expect.stringMatching(/ 500 \d+ms - a made-up failure$/u) as unknown }),
    ]);
  });
});
