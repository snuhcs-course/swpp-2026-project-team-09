/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Logger } from '@nestjs/common';
import { type Request } from 'express';
import { keepsBodies } from './bodiless-routes.js';
import { bodySize, logBody, withoutInviteTokens } from './log-body.js';
import { requestContext } from './request-context.js';

// The one line each request leaves (README.md: Logging): the logging interceptor writes it for a request its handler
// answered, and the exception filter for one that ended in an exception.

// The load balancer and the kubelet call these every few seconds.
const UNLOGGED_PATHS = new Set(['/health/live', '/health/ready']);

function pathOf(request: Request): string {
  return request.originalUrl.split('?')[0] ?? '';
}

// A request's path as the log writes it: with its IDs, without its query string or an Invite Link's token.
export function requestPath(request: Request): string {
  return withoutInviteTokens(pathOf(request));
}

export function isLogged(request: Request): boolean {
  return !UNLOGGED_PATHS.has(pathOf(request));
}

export function elapsedMs(): number {
  const values = requestContext.getStore();
  return values === undefined ? 0 : Math.round(performance.now() - values.startedAt);
}

// `<method> <path> <status> <ms>ms`.
export function lineStart(request: Request, status: number): string {
  return `${request.method} ${requestPath(request)} ${status} ${elapsedMs()}ms`;
}

// The request's body as `req_body` and, when given, the response's as `res_body`; none for a route of
// BODILESS_ROUTES. A body that cannot be written is left out: a throw here would turn a logged answer into a 500.
export function bodyFields(
  request: Request,
  response?: { body: unknown; contentType: string | undefined },
): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!keepsBodies(pathOf(request))) {
    return fields;
  }
  try {
    const requestBody = requestBodyOf(request);
    if (requestBody !== undefined) {
      fields.req_body = requestBody;
    }
    const responseBody = response === undefined ? undefined : logBody(response.body, response.contentType);
    if (responseBody !== undefined) {
      fields.res_body = responseBody;
    }
  } catch {
    return {};
  }
  return fields;
}

export function logRequestLine(
  logger: Logger,
  request: Request,
  status: number,
  response: { body: unknown; contentType: string | undefined },
): void {
  if (!isLogged(request)) {
    return;
  }
  const fields = bodyFields(request, response);
  if (Object.keys(fields).length === 0) {
    logger.log(lineStart(request, status));
  } else {
    logger.log(lineStart(request, status), fields);
  }
}

function requestBodyOf(request: Request): string | undefined {
  const body: unknown = request.body;
  if (body !== undefined) {
    return logBody(body, 'application/json');
  }
  // A body no parser read, such as a file, is written as its type and size.
  const length = Number(request.headers['content-length'] ?? 0);
  return length > 0 ? bodySize(request.headers['content-type'], length) : undefined;
}
