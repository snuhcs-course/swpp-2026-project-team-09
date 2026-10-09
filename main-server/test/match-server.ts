// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #45 #48
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';

export interface MatchServerCall {
  method: string;
  path: string;
  body: unknown;
  authorization: string | null;
}

// Answers in the match server's place when a test gave no answer, so that no test reaches a match server.
export function refuseMatchServer(): Promise<Response> {
  return Promise.reject(new Error('The test gave the match server no answer'));
}

// Stands for the match server: answers each call with the answer last given for its method and path, and keeps each
// call. A call it was given no answer for fails, as one to a match server that is down.
export class MatchServerStub {
  calls: MatchServerCall[] = [];
  private readonly responses = new Map<string, (signal?: AbortSignal | null) => Promise<Response>>();

  // The answer to `method path`: a body with its status, or no body for 204.
  answers(method: string, path: string, status: number, body?: unknown): void {
    this.responses.set(`${method} ${path}`, () =>
      Promise.resolve(body === undefined ? new Response(null, { status }) : Response.json(body, { status })),
    );
  }

  // A refusal with a code, as the match server gives one.
  refuses(method: string, path: string, status: 404 | 409, code: string): void {
    const error = status === 404 ? 'Not Found' : 'Conflict';
    this.answers(method, path, status, { statusCode: status, error, code, message: `Refused: ${code}` });
  }

  // Never answers: the call ends when the caller gives it up, as fetch ends it.
  hangs(method: string, path: string): void {
    this.responses.set(
      `${method} ${path}`,
      (signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => {
            const reason: unknown = signal.reason;
            reject(reason instanceof Error ? reason : new Error(String(reason)));
          });
        }),
    );
  }

  // Give it to startApp in place of the HTTP call to the match server.
  readonly fetch: typeof fetch = (input, init) => {
    const { pathname } = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : null;
    this.calls.push({ method, path: pathname, body, authorization: new Headers(init?.headers).get('Authorization') });
    const respond = this.responses.get(`${method} ${pathname}`) ?? refuseMatchServer;
    return respond(init?.signal);
  };
}

// Posts to a route for the match server as the match server does: with MATCH_SERVER_TOKEN unless `token` names
// another, or with none for `null`.
export function postAsMatchServer(
  app: INestApplication<Server>,
  path: string,
  body: object,
  token: string | null = inject('settings').MATCH_SERVER_TOKEN,
): request.Test {
  const call = request(app.getHttpServer()).post(path);
  return (token === null ? call : call.auth(token, { type: 'bearer' })).send(body);
}

export function askForMatching(app: INestApplication<Server>, user: TestUser, body: object): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/matching-requests'), user.accessToken).send(body);
}

export function withdrawMatching(app: INestApplication<Server>, user: TestUser, globalEventId: string): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).post(`/matching-requests/${globalEventId}/withdraw`),
    user.accessToken,
  );
}

export function getMatchingRequest(app: INestApplication<Server>, user: TestUser, globalEventId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).get(`/matching-requests/${globalEventId}`), user.accessToken);
}

export function getMatchingRequests(app: INestApplication<Server>, user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/matching-requests'), user.accessToken);
}
