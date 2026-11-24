/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { bodySize, logBody } from './log-body.js';
import { requestContext, type RequestContextValues } from './request-context.js';

export const REQUEST_ID_HEADER = 'X-Request-Id';

// The load balancer and the kubelet call these every few seconds.
const UNLOGGED_PATHS = new Set(['/health/live', '/health/ready']);

// A request's path as the log writes it: with its IDs, without its query string.
export function requestPath(request: Request): string {
  return request.originalUrl.split('?')[0] ?? '';
}

export function elapsedMs(values: RequestContextValues | undefined): number {
  return values === undefined ? 0 : Math.round(performance.now() - values.startedAt);
}

// Applied to every route, so it sees what a guard refuses, what the idempotency interceptor answers from its store, and
// paths that match no route. It opens the request's context and logs one line when the response has been sent
// (README.md: Logging).
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: () => void): void {
    const values: RequestContextValues = { reqId: randomUUID(), startedAt: performance.now() };
    response.setHeader(REQUEST_ID_HEADER, values.reqId);
    if (!UNLOGGED_PATHS.has(requestPath(request))) {
      this.logWhenSent(request, response, values);
    }
    requestContext.run(values, next);
  }

  private logWhenSent(request: Request, response: Response, values: RequestContextValues): void {
    let sent: unknown;
    const send = response.send.bind(response);
    // Express's json() ends in send() too, with the JSON as text: the last body given is the one sent.
    response.send = (body?: unknown): Response => {
      sent = body;
      return send(body);
    };
    response.once('finish', () => {
      const fields: Record<string, string> = {};
      const requestBody = this.requestBody(request);
      if (requestBody !== undefined) {
        fields.req_body = requestBody;
      }
      const responseBody = logBody(sent, headerText(response.getHeader('content-type')));
      if (responseBody !== undefined) {
        fields.res_body = responseBody;
      }
      const line = `${request.method} ${requestPath(request)} ${response.statusCode} ${elapsedMs(values)}ms`;
      requestContext.run(values, () => {
        if (Object.keys(fields).length === 0) {
          this.logger.log(line);
        } else {
          this.logger.log(line, fields);
        }
      });
    });
  }

  private requestBody(request: Request): string | undefined {
    const contentType = request.headers['content-type'];
    const body: unknown = request.body;
    if (body !== undefined) {
      return logBody(body, 'application/json');
    }
    // A body no parser read, such as a file, is written as its type and size.
    const length = Number(request.headers['content-length'] ?? 0);
    return length > 0 ? bodySize(contentType, length) : undefined;
  }
}

function headerText(value: number | string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value?.toString();
}
