/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { type PushService } from '../src/push/push.service.js';
import { withAccessToken } from './sign-in.js';

export interface ExpoPushRequest {
  url: string;
  method: string | undefined;
  accept: string | null;
  contentType: string | null;
  body: unknown;
}

// Answers in Expo's place when a test gave no answer, so that no test reaches Expo.
export function refuseExpoPush(): Promise<Response> {
  return Promise.reject(new Error('The test gave Expo no answer'));
}

// Stands for Expo's push service: answers every request with the answer it was last given, and keeps each request
// with its parsed JSON body.
export class ExpoPushStub {
  requests: ExpoPushRequest[] = [];
  private respond: (signal?: AbortSignal | null) => Promise<Response> = refuseExpoPush;

  reset(): void {
    this.requests = [];
    this.respond = refuseExpoPush;
  }

  answers(body: string, status = 200): void {
    this.respond = (): Promise<Response> =>
      Promise.resolve(new Response(body, { status, headers: { 'Content-Type': 'application/json' } }));
  }

  fails(error: Error): void {
    this.respond = (): Promise<Response> => Promise.reject(error);
  }

  // Never answers: the call ends when the caller gives it up, as fetch ends it.
  hangs(): void {
    this.respond = (signal): Promise<Response> =>
      new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          const reason: unknown = signal.reason;
          reject(reason instanceof Error ? reason : new Error(String(reason)));
        });
      });
  }

  // Answers no request until the test calls the returned function with the answer. A call given up first ends as
  // fetch ends it, so that nothing is left pending.
  holds(): (body: string, status?: number) => void {
    let release!: (answer: { body: string; status: number }) => void;
    const held = new Promise<{ body: string; status: number }>((resolve) => {
      release = resolve;
    });
    this.respond = (signal): Promise<Response> =>
      new Promise((resolve, reject) => {
        signal?.addEventListener('abort', () => {
          const reason: unknown = signal.reason;
          reject(reason instanceof Error ? reason : new Error(String(reason)));
        });
        void held.then(({ body, status }) => {
          resolve(new Response(body, { status, headers: { 'Content-Type': 'application/json' } }));
        });
      });
    return (body, status = 200) => {
      release({ body, status });
    };
  }

  // Give it to startApp in place of fetch.
  readonly fetch: typeof fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const headers = new Headers(init?.headers);
    this.requests.push({
      url,
      method: init?.method,
      accept: headers.get('Accept'),
      contentType: headers.get('Content-Type'),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
    });
    return this.respond(init?.signal);
  };
}

// A well-formed Expo push token that no phone holds.
export function madeUpPushToken(): string {
  return `ExponentPushToken[${randomUUID()}]`;
}

export function putPushToken(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  body: object,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).put('/users/me/push-token'), accessToken).send(body);
}

// Registers the token for the Session of the access token, or throws.
export async function registerPushToken(
  app: INestApplication<Server>,
  accessToken: string,
  token: string,
): Promise<void> {
  const response = await putPushToken(app, accessToken, { token });
  if (response.status !== 204) {
    throw new Error(`Registering a push token answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}

// Imported after startApp, so that it is the class the server registered. Await its `settled()` before checking the
// stand-in and before closing the app.
export async function pushServiceOf(app: INestApplication<Server>): Promise<PushService> {
  const { PushService: registered } = await import('../src/push/push.service.js');
  return app.get(registered);
}
