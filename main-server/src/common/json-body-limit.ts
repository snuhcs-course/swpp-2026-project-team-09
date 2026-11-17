/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';

// Express takes a JSON body of up to 100 kB unless told otherwise, and a week of the Co-op's menus from the worker
// comes to about that.
export const JSON_BODY_LIMIT = '1mb';

// A timetable screenshot to read (P15-52) comes in base64: up to 5 MB of picture is about 6.7 MB of JSON.
export const READING_BODY_LIMIT = '7mb';
export const READING_PATH = '/timetable/readings';

// The JSON parsers: the reading's own, with its limit, before the one of every other route, which then finds the
// reading's body read already and leaves it. Both src/main.ts and the tests' app call this.
export function useJsonBodyParsers(app: NestExpressApplication): void {
  app.use(READING_PATH, json({ limit: READING_BODY_LIMIT }));
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
}
