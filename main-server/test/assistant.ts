/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { type z } from 'zod';
import { type assistantMessagesSchema } from '../src/assistant/dto/assistant-messages.dto.js';
import { withAccessToken } from './sign-in.js';

// One message as the app sends it: an Assistant's may leave out its cards.
export type SentMessage = z.input<typeof assistantMessagesSchema>['messages'][number];

// Sends the conversation as the app does: the messages so far, the User's new one last, and `more` beside them, such
// as clientCapabilities. A test of a refusal may send messages of another shape.
export function postAssistantMessages(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  messages: readonly object[],
  more: object = {},
): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/assistant/messages'), accessToken).send({
    messages,
    ...more,
  });
}

// A reply's parts beside its text when it shows nothing.
export const NOTHING_SHOWN = { mapButtons: [], cards: [], proposal: null, answer: null, lookup: null, refusal: null };

// One message of the User's.
export function ask(text: string): SentMessage[] {
  return [{ role: 'user', text }];
}

// Everything written to the server's log, to the console and to the process's output, from now on.
export function captureLogs(): () => string {
  const values = captureLogValues();
  return () =>
    values()
      .map((value) => logText(value))
      .join('\n');
}

// A request line's message, and the same line as the text format prints it (README.md: Logging).
const REQUEST_LINE = /^[A-Z]+ \/\S* \d{3} \d+ms$/u;
// Colour codes may come before the method. An error line goes on with " - " and the error.
const PRINTED_REQUEST_LINE = /\[HTTP\] \S*?[A-Z]+ \/\S* \d{3} \d+ms(?! - )/u;

function isRequestLine(value: unknown): boolean {
  if (typeof value === 'string') {
    return REQUEST_LINE.test(value) || PRINTED_REQUEST_LINE.test(value);
  }
  return typeof value === 'object' && value !== null && ('req_body' in value || 'res_body' in value);
}

// As captureLogs, with the request lines apart: they hold whole request and response bodies, and every other line is
// held to the rules of what is never logged.
export function captureLogsApart(): { requestLines: () => string; otherLines: () => string } {
  const values = captureLogValues();
  const text = (requestLines: boolean): string =>
    values()
      .filter((value) => isRequestLine(value) === requestLines)
      .map((value) => logText(value))
      .join('\n');
  return { requestLines: () => text(true), otherLines: () => text(false) };
}

function logText(value: unknown): string {
  return value instanceof Error ? `${value.message} ${value.stack}` : JSON.stringify(value);
}

function captureLogValues(): () => unknown[] {
  const spies = [
    ...(['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const).map((level) =>
      vi.spyOn(Logger.prototype, level),
    ),
    ...(['log', 'warn', 'error', 'info', 'debug'] as const).map((level) => vi.spyOn(console, level)),
    vi.spyOn(process.stdout, 'write'),
    vi.spyOn(process.stderr, 'write'),
  ];
  return () =>
    spies.flatMap((spy) => {
      const values: unknown[] = spy.mock.calls.flat();
      return values;
    });
}
