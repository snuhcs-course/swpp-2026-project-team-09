/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { allowUsage, identifyUser } from '@/telemetry';
import type { Captured, FakeClient } from './posthog';
import { fakePostHog } from './posthog';

// The usage data's events as the app's own code sends them, for the tests of the five actions and of
// `api_request_failed` (P08 ticket 13): sending started as a sign-in does it, the events read back without the six
// common properties, and the check that every recorded event holds only what the registry lets it.

export const USAGE_TOKEN = 'phc_test';
export const USAGE_USER = '0193a5c1-0000-7000-8000-000000000001';

// The six properties every event carries.
const COMMON = new Set(['source', 'app_version', 'release_tag', 'release_commit', 'runtime_version', 'platform']);

// Each event of the registry (`src/telemetry/events.ts`) with the properties it may carry, and the fixed words each
// may hold. A `route` is checked by its shape, a main server's `code` by its, the rest by their words.
const REASONS = ['network', 'timeout', 'server_error', 'refused'];
const LIBRARY_CODES = ['seat_taken', 'not_allowed', 'session_ended', 'no_session'];
const ROUTE = /^(?:\/(?:[a-z][a-z-]*|:id))*\/?$/u;
const SERVER_CODE = /^[A-Z][A-Z\d_]*$/u;

type Check = (value: unknown) => boolean;
const oneOf =
  (...words: string[]): Check =>
  (value) =>
    typeof value === 'string' && words.includes(value);
const shaped =
  (pattern: RegExp): Check =>
  (value) =>
    typeof value === 'string' && pattern.test(value);

const VISIBILITY = oneOf('public', 'private');
const JOIN_HOW = oneOf('invitation_accepted', 'joined_directly', 'request_accepted');
const FRIENDSHIP_HOW = oneOf('request_accepted', 'invite_link_accepted');
const REASON = oneOf(...REASONS);
const SERVER_FAILURE = { reason: REASON, code: shaped(SERVER_CODE) };
const LIBRARY_FAILURE = { reason: REASON, code: oneOf(...LIBRARY_CODES) };

const REGISTRY: Readonly<Record<string, Readonly<Record<string, Check>>>> = {
  app_opened: {},
  screen_viewed: { route: shaped(ROUTE) },
  assistant_reply_requested: {},
  assistant_reply_completed: {},
  assistant_reply_failed: SERVER_FAILURE,
  party_creation_requested: { visibility: VISIBILITY },
  party_creation_completed: { visibility: VISIBILITY },
  party_creation_failed: { visibility: VISIBILITY, ...SERVER_FAILURE },
  party_join_requested: { how: JOIN_HOW },
  party_join_completed: { how: JOIN_HOW },
  party_join_failed: { how: JOIN_HOW, ...SERVER_FAILURE },
  friendship_creation_requested: { how: FRIENDSHIP_HOW },
  friendship_creation_completed: { how: FRIENDSHIP_HOW },
  friendship_creation_failed: { how: FRIENDSHIP_HOW, ...SERVER_FAILURE },
  seat_booking_requested: {},
  seat_booking_completed: {},
  seat_booking_failed: LIBRARY_FAILURE,
  api_request_failed: {
    route: shaped(ROUTE),
    method: oneOf('GET', 'POST', 'PUT', 'PATCH', 'DELETE'),
    reason: REASON,
  },
};

// What of a recorded event the registry does not allow, one line each: an event outside it, a property it does not
// list for the event, a value that is not one of its words, or a `code` on anything but `refused`. Empty when all is
// as the registry has it. PostHog's own `$identify` is the SDK's, and carries no properties of ours.
export function outsideRegistry(captured: readonly Captured[]): string[] {
  const wrong: string[] = [];
  for (const { event, properties } of captured) {
    if (event === '$identify') {
      continue;
    }
    const allowed = REGISTRY[event];
    if (allowed === undefined) {
      wrong.push(`${event}: not in the registry`);
      continue;
    }
    for (const [name, value] of Object.entries(properties)) {
      const check = allowed[name];
      if (COMMON.has(name)) {
        continue;
      }
      if (check === undefined) {
        wrong.push(`${event}: ${name} is not its property`);
      } else if (!check(value)) {
        wrong.push(`${event}: ${name} holds ${JSON.stringify(value)}`);
      }
    }
    if ('code' in properties && properties.reason !== 'refused') {
      wrong.push(`${event}: code without refused`);
    }
  }
  return wrong;
}

// Every event a client recorded, sent or still queued.
export function recorded(client: FakeClient): Captured[] {
  return [...client.sent, ...client.queue];
}

// The client the layer made last, which holds this test's events.
export function lastClient(): FakeClient {
  const client = fakePostHog().clients.at(-1);
  if (client === undefined) {
    throw new Error('The layer made no PostHog client');
  }
  return client;
}

// The events of the five actions and api_request_failed, each with its own properties only, in order.
export function actionEvents(client: FakeClient): [string, Record<string, unknown>][] {
  return recorded(client)
    .filter(({ event }) => event !== '$identify' && event !== 'app_opened' && event !== 'screen_viewed')
    .map(({ event, properties }) => [
      event,
      Object.fromEntries(Object.entries(properties).filter(([name]) => !COMMON.has(name))),
    ]);
}

// Sending started as a sign-in starts it, for a User who chose usage data; gives the client with nothing recorded.
export function startUsage(): FakeClient {
  process.env.EXPO_PUBLIC_POSTHOG_TOKEN = USAGE_TOKEN;
  allowUsage(true);
  identifyUser(USAGE_USER);
  const client = lastClient();
  forgetRecorded(client);
  return client;
}

export function forgetRecorded(client: FakeClient): void {
  client.queue = [];
  client.sent.length = 0;
}

// The events of an action in an integration test: its stages, and the `api_request_failed` of its own request, by its
// scrubbed route. The others are left out: the main screen reads again at any moment, and the fake main server
// answers a route a test did not set with 404, as GET /parties/mine answers 404 NOT_IN_PARTY for a User in no Party.
export function eventsOfAction(client: FakeClient | null, route?: string): [string, Record<string, unknown>][] | null {
  if (client === null) {
    return null;
  }
  return actionEvents(client).filter(
    ([event, properties]) => event !== 'api_request_failed' || properties.route === route,
  );
}
