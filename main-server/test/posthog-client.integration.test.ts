/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { gunzipSync, inflateSync } from 'node:zlib';
import { posthogClient } from '../src/usage/usage.service.js';
import { POSTHOG_TOKEN } from './usage.js';

// The adapter over posthog-node 6.0.6, with its fetch replaced so that nothing leaves the process: the host, GeoIP off,
// one try, the close sending what is pending, a failure told through onError; and that no other file imports it.

const USER = '3f2c1b7e-0000-4000-8000-000000000001';
const MESSAGE = {
  distinctId: USER,
  event: 'assistant_reply_completed' as const,
  properties: { source: 'server' },
};

interface Call {
  url: string;
  body: unknown;
}

function bytesOf(body: unknown): Buffer {
  if (typeof body === 'string') {
    return Buffer.from(body);
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  throw new Error(`An unexpected body: ${typeof body}`);
}

// Reads the request's body as posthog-node encoded it.
async function decoded(init: { body?: unknown; headers: Record<string, string> }): Promise<unknown> {
  const raw = init.body instanceof Blob ? Buffer.from(await init.body.arrayBuffer()) : bytesOf(init.body);
  const encoding = Object.entries(init.headers).find(([name]) => name.toLowerCase() === 'content-encoding')?.[1];
  const text = encoding === 'gzip' ? gunzipSync(raw) : encoding === 'deflate' ? inflateSync(raw) : raw;
  return JSON.parse(text.toString('utf8'));
}

// Keeps each request and answers as `answer` says, once its body is read.
function fakeFetch(answer: () => Promise<Response>, calls: Call[]) {
  return async (url: string, init: { body?: unknown; headers: Record<string, string> }): Promise<Response> => {
    calls.push({ url, body: await decoded(init) });
    return answer();
  };
}

describe('posthogClient', () => {
  it('sends to PostHog Cloud US with GeoIP off, the event as given and no person property, and the close waits for it', async () => {
    const calls: Call[] = [];
    const errors: unknown[] = [];
    const client = posthogClient(
      POSTHOG_TOKEN,
      (error) => {
        errors.push(error);
      },
      fakeFetch(() => Promise.resolve(new Response('{"results":{}}', { status: 200 })), calls),
    );

    void client.capture(MESSAGE);
    await client.shutdown(3000);

    const captures = calls.filter(({ url }) => !url.includes('/flags'));
    expect(captures).toHaveLength(1);
    const [{ url, body }] = captures;
    expect(new URL(url).origin).toBe('https://us.i.posthog.com');
    expect(url).not.toContain(POSTHOG_TOKEN);
    const text = JSON.stringify(body);
    expect(text).toContain(USER);
    expect(text).toContain('assistant_reply_completed');
    expect(text).toContain('"$geoip_disable":true');
    expect(text).not.toContain('"$set"');
    expect(errors).toEqual([]);
  });

  it('tries a failed request once and tells the failure through onError', async () => {
    const calls: Call[] = [];
    const errors: unknown[] = [];
    const client = posthogClient(
      POSTHOG_TOKEN,
      (error) => {
        errors.push(error);
      },
      fakeFetch(() => Promise.reject(new TypeError('fetch failed')), calls),
    );

    await client.capture(MESSAGE);
    await client.shutdown(3000);

    expect(calls.filter(({ url }) => !url.includes('/flags'))).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
  });
});
