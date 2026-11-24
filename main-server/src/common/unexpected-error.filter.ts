/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ArgumentsHost, Catch, HttpException, HttpServer, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { type Request, type Response } from 'express';
import { requestContext } from './request-context.js';
import { bodyFields, isLogged, lineStart, logRequestLine } from './request-line.js';

// Registered globally in AppModule (README.md: Logging), it writes the line of every request that ends in an
// exception, the logging interceptor writing the others. What the code throws on purpose (a guard's 401 or 403, a
// validation's 400, a 404, a 429) is answered as NestJS answers it, and its line is an info line with that answer as
// `res_body`. Anything else is an error line, once, with its stack and the request's body, and is answered 500 with the
// request's ID.
@Catch()
export class UnexpectedErrorFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('HTTP');

  override catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      // The main server answers HTTP only.
      throw exception;
    }
    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      logRequestLine(this.logger, request, exception.getStatus(), {
        body: answerOf(exception),
        contentType: 'application/json',
      });
      super.catch(exception, host);
      return;
    }
    if (this.isHttpError(exception)) {
      // A third party's HTTP error, such as a parser's: answered as NestJS answers it, which would log it as an error.
      const answer = { statusCode: exception.statusCode, message: exception.message };
      logRequestLine(this.logger, request, answer.statusCode, { body: answer, contentType: 'application/json' });
      this.reply(response, answer, answer.statusCode, exception);
      return;
    }
    this.logUnexpected(request, exception);
    const answer = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      requestId: requestContext.getStore()?.reqId,
    };
    this.reply(response, answer, HttpStatus.INTERNAL_SERVER_ERROR, exception);
  }

  private logUnexpected(request: Request, exception: unknown): void {
    if (!isLogged(request)) {
      return;
    }
    const line = `${lineStart(request, HttpStatus.INTERNAL_SERVER_ERROR)} - ${describe(exception)}`;
    const fields = bodyFields(request);
    const stack = exception instanceof Error ? exception.stack : undefined;
    const rest: (string | Record<string, string>)[] = [
      ...(stack === undefined ? [] : [stack]),
      ...(Object.keys(fields).length === 0 ? [] : [fields]),
    ];
    this.logger.error(line, ...rest);
  }

  private reply(response: Response, answer: object, status: number, exception: unknown): void {
    // Nest injects the adapter's host into a filter registered with APP_FILTER.
    const adapter: HttpServer | undefined = this.applicationRef ?? this.httpAdapterHost?.httpAdapter;
    if (adapter === undefined) {
      throw exception;
    }
    if (adapter.isHeadersSent(response)) {
      adapter.end(response);
      return;
    }
    adapter.reply(response, answer, status);
  }
}

// What BaseExceptionFilter answers for an HttpException.
function answerOf(exception: HttpException): object {
  const answer = exception.getResponse();
  return typeof answer === 'object'
    ? answer
    : {
        statusCode: exception.getStatus(),
        message: answer,
        ...(exception.errorCode !== undefined && { errorCode: exception.errorCode }),
      };
}

function describe(exception: unknown): string {
  return exception instanceof Error ? `${exception.name}: ${exception.message}` : String(exception);
}
