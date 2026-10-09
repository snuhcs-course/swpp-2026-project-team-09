// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by Jaehyun0320 and fyoon46
// A main server behind `fetch`, as a test sets it up: each route answers what the test says, and every request is
// remembered. A route the test did not set answers 404.

export const MAIN_SERVER = 'http://main.test';
export const SOCKET_SERVER = 'http://socket.test';

export interface Received {
  method: string;
  path: string;
  query: Record<string, string>;
  // The Authorization header, or null without one.
  authorization: string | null;
  // The Idempotency-Key header; left out without one.
  idempotencyKey?: string;
  body: unknown;
}

// A status with a body, or no answer at all, as when the network is down.
export type Reply = { status: number; body?: unknown } | 'no-answer';

type Route = Reply | ((request: Received) => Reply);

export interface FakeServer {
  // `route` is a method and a path, "GET /friends". A function answers each request by what it holds.
  on: (route: string, reply: Route) => void;
  // The requests that reached the route, or every request without one.
  received: (route?: string) => Received[];
}

function headerOf(init: RequestInit | undefined, name: string): string | null {
  const headers = new Headers(init?.headers);
  return headers.get(name);
}

function bodyOf(init: RequestInit | undefined): unknown {
  if (typeof init?.body !== 'string') {
    return null;
  }
  const body: unknown = JSON.parse(init.body);
  return body;
}

function urlOf(input: RequestInfo | URL): URL {
  if (input instanceof URL) {
    return input;
  }
  return new URL(typeof input === 'string' ? input : input.url);
}

// Puts the fake main server behind `fetch` for the rest of the test.
export function startFakeServer(): FakeServer {
  const routes = new Map<string, Route>();
  const received: { route: string; request: Received }[] = [];
  jest.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = urlOf(input);
    const method = init?.method ?? 'GET';
    const route = `${method} ${url.pathname}`;
    const request: Received = {
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      authorization: headerOf(init, 'Authorization'),
      idempotencyKey: headerOf(init, 'Idempotency-Key') ?? undefined,
      body: bodyOf(init),
    };
    received.push({ route, request });
    const set = routes.get(route) ?? { status: 404, body: { statusCode: 404, message: 'Not Found' } };
    const reply = typeof set === 'function' ? set(request) : set;
    if (reply === 'no-answer') {
      return Promise.reject(new TypeError('Network request failed'));
    }
    const text = reply.body === undefined ? null : JSON.stringify(reply.body);
    return Promise.resolve(new Response(text, { status: reply.status }));
  });
  return {
    on: (route, reply): void => {
      routes.set(route, reply);
    },
    received: (route) =>
      received.filter((entry) => route === undefined || entry.route === route).map(({ request }) => request),
  };
}

// A refusal as the main server words one.
export function refusal(status: number, code?: string, more: object = {}): Reply {
  return { status, body: { statusCode: status, ...(code === undefined ? {} : { code }), message: 'Refused', ...more } };
}
