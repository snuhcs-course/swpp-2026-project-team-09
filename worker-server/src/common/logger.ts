/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import { z } from 'zod';
import { settingsSchema } from './settings.js';

// The same in both formats (main-server README: Logging): no code logs at debug or verbose.
const LOG_LEVELS: LogLevel[] = ['log', 'warn', 'error', 'fatal'];

// Chosen from LOG_FORMAT before the Nest application is created, so that a start's first lines are already in that
// format.
export function createLogger(env: Record<string, string | undefined>): ConsoleLogger {
  const { LOG_FORMAT } = z.object({ LOG_FORMAT: settingsSchema.shape.LOG_FORMAT }).parse(env);
  return new ConsoleLogger({ json: LOG_FORMAT === 'json', logLevels: LOG_LEVELS });
}
