/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { REDIRECT_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { type Request, type Response } from 'express';
import { type Observable, tap } from 'rxjs';
import { logRequestLine } from './request-line.js';

// Registered globally (README.md: Logging): the request line of a request its handler answered, written once the
// handler's answer is there, with that answer as `res_body`. A request that ends in an exception is left to the
// exception filter, which writes its line.
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const redirect = this.reflector.get<RedirectMetadata | undefined>(REDIRECT_METADATA, context.getHandler());
    return next.handle().pipe(
      tap((body: unknown) => {
        logRequestLine(this.logger, request, statusOf(response, redirect, body), {
          body: redirect === undefined ? body : undefined,
          contentType: headerText(response.getHeader('content-type')),
        });
      }),
    );
  }
}

interface RedirectMetadata {
  url: string;
  statusCode?: number;
}

// The status the client gets. The router sets the response's status, @HttpCode's included, before the interceptors
// run, but a @Redirect()'s after them, from the handler's answer or the decorator, 302 by default.
function statusOf(response: Response, redirect: RedirectMetadata | undefined, body: unknown): number {
  if (redirect === undefined) {
    return response.statusCode;
  }
  const answered = typeof body === 'object' && body !== null && 'statusCode' in body ? body.statusCode : undefined;
  return typeof answered === 'number' ? answered : (redirect.statusCode ?? 302);
}

function headerText(value: number | string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value?.toString();
}
