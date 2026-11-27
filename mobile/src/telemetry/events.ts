/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { scrubPath } from './scrub';

// The event registry (README.md, "Usage data"): every event the app may send to PostHog, each with the type of its
// properties, as the P08 spec's table has them. `track` takes only a name from here and exactly its properties, so a
// new event, or a new property, is a change to this file. No property is free text: `route` is made only by
// `scrubbedRoute` below, a main server's code only by `serverCode`, and every other property is a union of fixed words.

declare const scrubbed: unique symbol;
declare const word: unique symbol;

// A route's pattern with every segment that is not a route word as `:id`, never a query: "/room/:id".
export type ScrubbedRoute = string & { readonly [scrubbed]: true };

// The main server's own word for a refusal, such as QUEST_FULL: capitals and underscores only.
export type ServerCode = string & { readonly [word]: true };

// The library's refusals, a closed list.
export type LibraryCode = 'seat_taken' | 'not_allowed' | 'session_ended' | 'no_session';

export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// `network`: nothing answered; `timeout`: the app gave up after its own limit; `server_error`: a 5xx, a 4xx without
// the main server's code, or an answer of a shape the app does not know; `refused`: a 4xx with the main server's code,
// or the library answering without a booking.
export type Reason = 'network' | 'timeout' | 'server_error' | 'refused';

// `code` is there on `refused` only.
export type Failure<Code extends string> = { reason: Exclude<Reason, 'refused'> } | { reason: 'refused'; code: Code };

export type Visibility = 'public' | 'private';
export type JoinHow = 'invitation_accepted' | 'joined_directly' | 'request_accepted';
export type FriendshipHow = 'request_accepted' | 'invite_link_accepted';

// An event without properties of its own.
type None = Record<never, never>;

export interface UsageEvents {
  app_opened: None;
  screen_viewed: { route: ScrubbedRoute };
  assistant_reply_requested: None;
  assistant_reply_completed: None;
  assistant_reply_failed: Failure<ServerCode>;
  party_creation_requested: { visibility: Visibility };
  party_creation_completed: { visibility: Visibility };
  party_creation_failed: { visibility: Visibility } & Failure<ServerCode>;
  party_join_requested: { how: JoinHow };
  party_join_completed: { how: JoinHow };
  party_join_failed: { how: JoinHow } & Failure<ServerCode>;
  friendship_creation_requested: { how: FriendshipHow };
  friendship_creation_completed: { how: FriendshipHow };
  friendship_creation_failed: { how: FriendshipHow } & Failure<ServerCode>;
  seat_booking_requested: None;
  seat_booking_completed: None;
  seat_booking_failed: Failure<LibraryCode>;
  api_request_failed: { route: ScrubbedRoute; method: Method; reason: Reason };
}

export type EventName = keyof UsageEvents;

// What `track` takes after the name: nothing for an event without properties, otherwise exactly its properties.
export type PropertiesOf<Name extends EventName> = None extends UsageEvents[Name] ? [] : [UsageEvents[Name]];

// What every event carries besides its own properties, added by the layer.
export interface CommonProperties {
  source: 'app';
  app_version: string;
  release_tag: string;
  release_commit: string;
  runtime_version: string;
  platform: string;
}

// A word of a route, as `scrub.ts` keeps it, and a word of the main server's codes.
const ROUTE_WORD = /^[a-z][a-z-]*$/u;
const SERVER_WORD = /^[A-Z][A-Z\d_]*$/u;

// A screen's route from expo-router's pattern ("/room/[questId]"), or a request's path or URL ("/quests/42/join?x=1"),
// as an event may carry it: "/room/:id", "/quests/:id/join".
export function scrubbedRoute(pathOrUrl: string): ScrubbedRoute {
  const route = scrubPath(pathOrUrl);
  if (!isScrubbed(route)) {
    throw new Error('A scrubbed path holds only route words and :id');
  }
  return route;
}

// What `scrubPath` gives: each segment a route word, `:id` or empty.
function isScrubbed(path: string): path is ScrubbedRoute {
  return path.split('/').every((segment) => segment === '' || segment === ':id' || ROUTE_WORD.test(segment));
}

function isServerCode(code: string): code is ServerCode {
  return SERVER_WORD.test(code);
}

// The main server's code as an event may carry it, or null for anything that is not one word of capitals.
export function serverCode(code: string | null): ServerCode | null {
  return code !== null && isServerCode(code) ? code : null;
}
