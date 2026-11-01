/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { type z } from 'zod';
import { type assistantMessagesSchema } from '../src/assistant/dto/assistant-messages.dto.js';
import { withAccessToken } from './sign-in.js';

// One message as the app sends it: an Assistant's may leave out its cards.
export type SentMessage = z.input<typeof assistantMessagesSchema>['messages'][number];

// Sends the conversation as the app does: the messages so far, the User's new one last. A test of a refusal may send
// messages of another shape.
export function postAssistantMessages(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  messages: readonly object[],
): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/assistant/messages'), accessToken).send({ messages });
}

// One message of the User's.
export function ask(text: string): SentMessage[] {
  return [{ role: 'user', text }];
}

// Everything written to the server's log, to the console and to the process's output, from now on.
export function captureLogs(): () => string {
  const spies = [
    ...(['log', 'warn', 'error', 'debug', 'verbose', 'fatal'] as const).map((level) =>
      vi.spyOn(Logger.prototype, level),
    ),
    ...(['log', 'warn', 'error', 'info', 'debug'] as const).map((level) => vi.spyOn(console, level)),
    vi.spyOn(process.stdout, 'write'),
    vi.spyOn(process.stderr, 'write'),
  ];
  return () =>
    spies
      .flatMap((spy) => {
        const values: unknown[] = spy.mock.calls.flat();
        return values;
      })
      .map((value) => (value instanceof Error ? `${value.message} ${value.stack}` : JSON.stringify(value)))
      .join('\n');
}
