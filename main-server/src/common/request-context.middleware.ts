/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, NestMiddleware } from '@nestjs/common';
import { type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { requestContext, type RequestContextValues } from './request-context.js';

export const REQUEST_ID_HEADER = 'X-Request-Id';

// Applied to every path, before the guards, as NestJS's "Async Local Storage" recipe does: it makes the request's ID,
// answers it as X-Request-Id, and opens the request's context, which every line logged during the request reads
// (README.md: Logging). It logs nothing itself.
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(_request: Request, response: Response, next: () => void): void {
    const values: RequestContextValues = { reqId: randomUUID(), startedAt: performance.now() };
    response.setHeader(REQUEST_ID_HEADER, values.reqId);
    requestContext.run(values, next);
  }
}
