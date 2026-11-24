/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import { z } from 'zod';
import { requestContext } from './request-context.js';
import { settingsSchema } from './settings.js';

// The same in both formats (README.md: Logging): no code logs at debug or verbose.
const LOG_LEVELS: LogLevel[] = ['log', 'warn', 'error', 'fatal'];

// A JSON line written while a request is handled names it and its User (README.md: Logging).
export class RequestContextLogger extends ConsoleLogger {
  // getJsonLogObject is not in NestJS's documentation (12.1): check it when NestJS is upgraded.
  protected override getJsonLogObject(
    message: unknown,
    options: { context: string; logLevel: LogLevel; errorStack?: unknown; params?: Record<string, unknown> },
  ): { [key: string]: unknown; level: LogLevel; pid: number; timestamp: number; message: unknown } {
    const line = super.getJsonLogObject(message, options);
    const values = requestContext.getStore();
    if (values !== undefined) {
      line.req_id = values.reqId;
      if (values.userId !== undefined) {
        line.user_id = values.userId;
      }
    }
    return line;
  }
}

// Chosen from LOG_FORMAT before the Nest application is created, so that a start's first lines are already in that
// format. A plain object given with a message puts its fields on the JSON line: logger.log(message, { req_body }).
export function createLogger(env: Record<string, string | undefined>): ConsoleLogger {
  const { LOG_FORMAT } = z.object({ LOG_FORMAT: settingsSchema.shape.LOG_FORMAT }).parse(env);
  return new RequestContextLogger({ json: LOG_FORMAT === 'json', logLevels: LOG_LEVELS, flattenParams: true });
}
