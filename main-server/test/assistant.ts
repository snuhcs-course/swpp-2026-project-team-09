/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
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

// A reply without its next line, which depends on what other tests left in the shared table of impressions; what it
// says is tested in next-lines.integration.test.ts.
export function besideNextLine(body: unknown): object {
  const { nextLine: _ignored, ...rest } = z.object({ nextLine: z.unknown() }).loose().parse(body);
  return rest;
}
