/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { ask, postAssistantMessages } from './assistant.js';
import { TestUser } from './friends.js';
import { ScriptedModel } from './scripted-model.js';
import { withAccessToken } from './sign-in.js';

// Teaching and asking the Assistant's aliases (P07 ticket 03) through HTTP, with the scripted model in the model's
// place.

const answerSchema = z.union([
  z.object({ result: z.literal('one'), candidate: z.object({ id: z.string() }).loose() }),
  z.object({ result: z.literal('several'), candidates: z.array(z.object({ id: z.string() }).loose()) }),
  z.object({ result: z.literal('none') }).loose(),
]);

export type Answer = z.infer<typeof answerSchema>;

// What a resolver answered the model, and the reply.
export interface Resolution {
  answer: Answer;
  body: { resolvedBy?: unknown; choices?: unknown };
}

// The User asks with their words, and the model passes them to the resolver as written.
export async function resolveAs(
  app: INestApplication<Server>,
  model: ScriptedModel,
  user: TestUser,
  words: string,
  tool: 'resolvePlace' | 'resolveFriend' = 'resolvePlace',
): Promise<Resolution> {
  model.script({ tool, input: tool === 'resolvePlace' ? { words } : { name: words } }, { text: '…' });
  const response = await postAssistantMessages(app, user.accessToken, ask(words));
  if (response.status !== 200) {
    throw new Error(`The Assistant answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const body = z.object({ resolvedBy: z.unknown(), choices: z.unknown() }).parse(response.body);
  return { answer: answerSchema.parse(model.toolResults()[0]), body };
}

// The ids of an answer, in order.
export function idsOf(answer: Answer): string[] {
  if (answer.result === 'one') {
    return [answer.candidate.id];
  }
  return answer.result === 'several' ? answer.candidates.map(({ id }) => id) : [];
}

// The User taps a chip: the candidate `id`, labelled `label`, for their words.
export async function chooseAs(
  app: INestApplication<Server>,
  model: ScriptedModel,
  user: TestUser,
  chosen: { kind: 'place' | 'friend'; id: string; words: string },
  label: string,
): Promise<void> {
  model.script({ text: '…' });
  const response = await postAssistantMessages(app, user.accessToken, [
    { role: 'user', text: chosen.words },
    { role: 'assistant', text: '어느 거요?' },
    { role: 'user', text: label, chosen },
  ]);
  if (response.status !== 200) {
    throw new Error(`The Assistant answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}

export function getAliases(app: INestApplication<Server>, user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/assistant/aliases'), user.accessToken);
}

export function deleteAlias(app: INestApplication<Server>, user: TestUser, id: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).delete(`/assistant/aliases/${id}`), user.accessToken);
}

export function rejectAlias(app: INestApplication<Server>, user: TestUser, body: object): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/assistant/aliases/reject'), user.accessToken).send(body);
}
