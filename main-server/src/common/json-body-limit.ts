/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type NestExpressApplication } from '@nestjs/platform-express';
import { json, raw } from 'express';

// Express takes a JSON body of up to 100 kB unless told otherwise, and a week of the Co-op's menus from the worker
// comes to about that.
export const JSON_BODY_LIMIT = '1mb';

// A timetable screenshot to read (P15-52) comes in base64: up to 5 MB of picture is about 6.7 MB of JSON.
export const READING_BODY_LIMIT = '7mb';
export const READING_PATH = '/timetable/readings';

// Sentry signs the bytes of its alert as it sent them (README.md: Crash alerts from Sentry), so that route takes its
// body unparsed, as a Buffer, whatever its Content-Type.
export const SENTRY_ALERTS_PATH = '/sentry/alerts';

// The body parsers: the reading's and Sentry's alerts' own, before the JSON one of every other route, which then finds
// their bodies read already and leaves them. Both src/main.ts and the tests' app call this.
export function useJsonBodyParsers(app: NestExpressApplication): void {
  app.use(READING_PATH, json({ limit: READING_BODY_LIMIT }));
  app.use(SENTRY_ALERTS_PATH, raw({ type: () => true, limit: JSON_BODY_LIMIT }));
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
}
