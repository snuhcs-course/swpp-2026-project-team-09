/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

// What is taken out of a report before it leaves the phone (README.md, "Crash reports"). Each function is pure: it
// returns a new value and leaves the one it was given alone.

// An error's message is cut to this many characters, as a message may hold what a User typed.
export const MESSAGE_LIMIT = 200;

// A word of a route, such as `quests` or `friend-ids`: lower-case letters and hyphens. Every route word the app calls
// (src/api/client.ts) is one, and no value is: not a UUID, a number or a coordinate, and not a Friend ID or an Invite
// Link's token either, which are letters and digits a pattern for ids would let through.
const ROUTE_WORD = /^[a-z][a-z-]*$/u;
// The scheme and host of an absolute URL, kept as they are.
const ORIGIN = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*/iu;

export function cutMessage(message: string): string {
  return message.length > MESSAGE_LIMIT ? message.slice(0, MESSAGE_LIMIT) : message;
}

// A segment is kept only when it is a route word. Whatever else stands in a path is a value, and becomes `:id`.
function scrubSegment(segment: string): string {
  return segment === '' || ROUTE_WORD.test(segment) ? segment : ':id';
}

// The URL without its query and fragment, and with every path segment that is not a route word as `:id`:
// "https://api.snunow.com/quests/42?lat=37.45#top" becomes "https://api.snunow.com/quests/:id".
export function scrubUrl(url: string): string {
  const origin = ORIGIN.exec(url)?.[0] ?? '';
  const rest = url.slice(origin.length);
  const path = rest.split(/[?#]/u, 1)[0] ?? '';
  return (
    origin +
    path
      .split('/')
      .map((segment) => scrubSegment(segment))
      .join('/')
  );
}

// The scrubbed path of a URL alone, without its scheme and host: "/quests/:id".
export function scrubPath(url: string): string {
  const scrubbed = scrubUrl(url);
  const origin = ORIGIN.exec(scrubbed)?.[0] ?? '';
  const path = scrubbed.slice(origin.length);
  return path === '' ? '/' : path;
}

function looksLikeUrl(value: string): boolean {
  return ORIGIN.test(value) || value.startsWith('/');
}

// Each string in a breadcrumb's data that is a URL or a path, scrubbed; the rest as it was.
function scrubData(data: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'string' && looksLikeUrl(value) ? scrubUrl(value) : value,
    ]),
  );
}

function isHttp(breadcrumb: Breadcrumb): boolean {
  return breadcrumb.type === 'http' || breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr';
}

// A breadcrumb as it may leave, or null when it may not. A console breadcrumb never leaves: what the app logs may
// hold anything. Of a request, only its method, its scrubbed path and its status are kept.
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === 'console') {
    return null;
  }
  if (isHttp(breadcrumb)) {
    const data = breadcrumb.data ?? {};
    const { method, url, status_code: status } = data;
    return {
      type: 'http',
      category: breadcrumb.category,
      level: breadcrumb.level,
      timestamp: breadcrumb.timestamp,
      data: {
        ...(typeof method === 'string' ? { method } : {}),
        ...(typeof url === 'string' ? { url: scrubPath(url) } : {}),
        ...(typeof status === 'number' ? { status_code: status } : {}),
      },
    };
  }
  return {
    ...breadcrumb,
    ...(breadcrumb.message === undefined ? {} : { message: cutMessage(breadcrumb.message) }),
    ...(breadcrumb.data === undefined ? {} : { data: scrubData(breadcrumb.data) }),
  };
}

function scrubRequest(request: NonNullable<ErrorEvent['request']>): ErrorEvent['request'] {
  // The query string, the cookies, the headers and the body are dropped with the URL's query.
  return {
    ...(request.method === undefined ? {} : { method: request.method }),
    ...(request.url === undefined ? {} : { url: scrubUrl(request.url) }),
  };
}

function scrubException(exception: NonNullable<ErrorEvent['exception']>): ErrorEvent['exception'] {
  return {
    ...exception,
    values: exception.values?.map((value) =>
      value.value === undefined ? value : { ...value, value: cutMessage(value.value) },
    ),
  };
}

// An error report as it may leave: its messages cut, its URLs and breadcrumbs scrubbed, the User as the id alone,
// and no device name or server name.
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const { user, request, exception, breadcrumbs, message, contexts, server_name: _serverName, ...rest } = event;
  const scrubbed: ErrorEvent = { ...rest };
  if (message !== undefined) {
    scrubbed.message = cutMessage(message);
  }
  if (exception !== undefined) {
    scrubbed.exception = scrubException(exception);
  }
  if (request !== undefined) {
    scrubbed.request = scrubRequest(request);
  }
  if (breadcrumbs !== undefined) {
    scrubbed.breadcrumbs = breadcrumbs.flatMap((breadcrumb) => scrubBreadcrumb(breadcrumb) ?? []);
  }
  if (user?.id !== undefined) {
    scrubbed.user = { id: user.id };
  }
  if (contexts !== undefined) {
    const { device, ...others } = contexts;
    if (device === undefined) {
      scrubbed.contexts = others;
    } else {
      const { name: _deviceName, ...deviceRest } = device;
      scrubbed.contexts = { ...others, device: deviceRest };
    }
  }
  return scrubbed;
}
