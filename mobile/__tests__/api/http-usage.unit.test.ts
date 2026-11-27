/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { ApiError } from '@/api/errors';
import { call } from '@/api/server/http';
import { heldTokens } from '@/auth/tokens';
import { forgetUser } from '@/telemetry';
import type { FakeClient } from '../support/posthog';
import { actionEvents, outsideRegistry, recorded, startUsage } from '../support/usage-actions';

// P08 ticket 13: `send` tells a request its own timer gave up (`timeout`) from no network and from one its caller gave
// up, with the same message; and `call` sends `api_request_failed` for a request that failed for good, nothing for a
// caller's abort, a 401 a renewal mended, or a success.

jest.mock('@/api/servers', () => ({ mainServerUrl: (): string => 'http://main.test' }));
jest.mock('@/auth/tokens', () => ({ heldTokens: jest.fn(() => null), keepTokens: jest.fn() }));
jest.mock('@/session/session-events', () => ({ endSession: jest.fn(), requireOnboarding: jest.fn() }));

const realFetch = globalThis.fetch;
const QUEST = '/quests/3f2a9c1e-0000-4000-8000-000000000042/join';
const anything = (value: unknown): value is unknown => value !== undefined;
const friends = (value: unknown): value is string[] => Array.isArray(value);

let client: FakeClient;

// A server that never answers: the request settles only when it is aborted, at once when it already was, as `fetch`
// does.
function silentFetch(): jest.Mock {
  return jest.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        if (init?.signal?.aborted === true) {
          reject(new Error('aborted'));
        }
        init?.signal?.addEventListener('abort', () => {
          reject(new Error('aborted'));
        });
      }),
  );
}

// Answers each request in turn.
function answering(...answers: [status: number, body: unknown][]): jest.Mock {
  const left = [...answers];
  return jest.fn(() => {
    const [status, body] = left.shift() ?? [500, null];
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  });
}

async function thrown(request: Promise<unknown>): Promise<ApiError> {
  const error = await request.catch((caught: unknown) => caught);
  if (!(error instanceof ApiError)) {
    throw new Error('The request did not fail with an ApiError');
  }
  return error;
}

beforeEach(() => {
  jest.useFakeTimers();
  client = startUsage();
});

afterEach(() => {
  expect(outsideRegistry(recorded(client))).toEqual([]);
  forgetUser();
  delete process.env.EXPO_PUBLIC_POSTHOG_TOKEN;
  globalThis.fetch = realFetch;
  jest.useRealTimers();
});

it('marks a request its own timer gave up as timeout, with the message of no answer', async () => {
  globalThis.fetch = silentFetch();
  const failed = thrown(call('POST', QUEST, anything, { timeoutMs: 1000 }));
  await jest.advanceTimersByTimeAsync(1000);
  const error = await failed;

  expect([error.status, error.code, error.givenUp, error.message]).toEqual([
    0,
    null,
    'timeout',
    new ApiError(0).message,
  ]);
  expect(actionEvents(client)).toEqual([
    ['api_request_failed', { route: '/quests/:id/join', method: 'POST', reason: 'timeout' }],
  ]);
});

it('marks nothing on a network failure, which is network', async () => {
  globalThis.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));
  const error = await thrown(call('GET', '/friends', friends, { timeoutMs: 1000 }));

  expect([error.status, error.givenUp]).toEqual([0, null]);
  expect(actionEvents(client)).toEqual([
    ['api_request_failed', { route: '/friends', method: 'GET', reason: 'network' }],
  ]);
});

it('marks a request its caller gave up, and sends nothing for it', async () => {
  globalThis.fetch = silentFetch();
  const abort = new AbortController();
  const failed = thrown(call('GET', '/friends', friends, { signal: abort.signal, timeoutMs: 1000 }));
  abort.abort();
  const error = await failed;
  await jest.advanceTimersByTimeAsync(1000);

  expect([error.status, error.givenUp, error.message]).toEqual([0, 'caller', new ApiError(0).message]);
  expect(actionEvents(client)).toEqual([]);
});

it('marks a request whose caller had given it up before it was sent', async () => {
  globalThis.fetch = silentFetch();
  const abort = new AbortController();
  abort.abort();
  const error = await thrown(call('GET', '/friends', friends, { signal: abort.signal }));

  expect(error.givenUp).toBe('caller');
  expect(actionEvents(client)).toEqual([]);
});

it('sends nothing for a 401 that a renewal mends', async () => {
  jest.mocked(heldTokens).mockReturnValue({ accessToken: 'old', refreshToken: 'refresh' });
  globalThis.fetch = answering(
    [401, { statusCode: 401, message: 'Unauthorized' }],
    [200, { accessToken: 'new', refreshToken: 'refresh-2' }],
    [200, ['f1']],
  );

  await expect(call('GET', '/friends', friends)).resolves.toEqual(['f1']);
  expect(actionEvents(client)).toEqual([]);
});

it('sends nothing for a request that succeeded', async () => {
  globalThis.fetch = answering([200, ['f1']]);

  await call('GET', '/friends', friends);
  expect(actionEvents(client)).toEqual([]);
});

it("sends refused for a refusal with the main server's code, and server_error for a 5xx and an unknown answer", async () => {
  globalThis.fetch = answering([409, { statusCode: 409, code: 'QUEST_FULL' }], [503, null], [200, { not: 'friends' }]);

  await thrown(call('POST', QUEST, anything));
  await thrown(call('GET', '/lobby', anything));
  const unexpected = await thrown(call('GET', '/friends?x=1', friends));

  expect(unexpected.code).toBe('UNEXPECTED_ANSWER');
  expect(actionEvents(client)).toEqual([
    ['api_request_failed', { route: '/quests/:id/join', method: 'POST', reason: 'refused' }],
    ['api_request_failed', { route: '/lobby', method: 'GET', reason: 'server_error' }],
    ['api_request_failed', { route: '/friends', method: 'GET', reason: 'server_error' }],
  ]);
});
