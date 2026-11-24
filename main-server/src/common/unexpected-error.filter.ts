/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ArgumentsHost, Catch, HttpException, HttpServer, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { type Request, type Response } from 'express';
import { requestContext } from './request-context.js';
import { elapsedMs, requestPath } from './request-logging.middleware.js';

// Registered globally in AppModule (README.md: Logging). What the code throws on purpose is answered by NestJS's own
// filter, as before, and logged nowhere. Anything else is logged here once, with its stack, and answered 500 with the
// request's ID.
@Catch()
export class UnexpectedErrorFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('HTTP');

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      // The main server answers HTTP only.
      throw exception;
    }
    if (exception instanceof HttpException || this.isHttpError(exception)) {
      super.catch(exception, host);
      return;
    }
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    const values = requestContext.getStore();
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const line = `${request.method} ${requestPath(request)} ${status} ${elapsedMs(values)}ms - ${describe(exception)}`;
    if (exception instanceof Error && exception.stack !== undefined) {
      this.logger.error(line, exception.stack);
    } else {
      this.logger.error(line);
    }
    // Nest injects the adapter's host into a filter registered with APP_FILTER.
    const adapter: HttpServer | undefined = this.applicationRef ?? this.httpAdapterHost?.httpAdapter;
    if (adapter === undefined) {
      throw exception;
    }
    if (adapter.isHeadersSent(response)) {
      adapter.end(response);
      return;
    }
    adapter.reply(response, { statusCode: status, message: 'Internal server error', requestId: values?.reqId }, status);
  }
}

function describe(exception: unknown): string {
  return exception instanceof Error ? `${exception.name}: ${exception.message}` : String(exception);
}
