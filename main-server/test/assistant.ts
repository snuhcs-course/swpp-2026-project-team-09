/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { type ChatMessage } from '../src/assistant/feature.js';
import { withAccessToken } from './sign-in.js';

// Sends the conversation as the app does: the messages so far, the User's new one last.
export function postAssistantMessages(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  messages: ChatMessage[],
): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/assistant/messages'), accessToken).send({ messages });
}

// One message of the User's.
export function ask(text: string): ChatMessage[] {
  return [{ role: 'user', text }];
}
