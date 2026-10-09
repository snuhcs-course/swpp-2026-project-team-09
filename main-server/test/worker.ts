/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';

// Sends a request as the worker server does, with its token. Resolves when the server took it, and rejects with the
// answer when it was refused.
export async function sendAsWorker(app: INestApplication<Server>, path: string, data: object): Promise<void> {
  const response = await request(app.getHttpServer())
    .post(path)
    .auth(inject('settings').WORKER_TOKEN, { type: 'bearer' })
    .send(data);
  if (response.status !== 204) {
    throw new Error(JSON.stringify(response.body));
  }
}

// Asks a question as the worker server does, with its token, and resolves with the answer.
export async function askAsWorker(app: INestApplication<Server>, path: string, data: object): Promise<unknown> {
  const response = await request(app.getHttpServer())
    .post(path)
    .auth(inject('settings').WORKER_TOKEN, { type: 'bearer' })
    .send(data);
  if (response.status !== 200) {
    throw new Error(JSON.stringify(response.body));
  }
  return response.body as unknown;
}

const refusalSchema = z.object({
  statusCode: z.number().min(400).max(499),
  message: z.string().or(z.array(z.string())),
});

// Sends a request that the server should refuse and resolves with the problem its answer names, the problems of a
// request that does not match its schema joined as the worker joins them.
export async function refusal(app: INestApplication<Server>, path: string, data: object): Promise<string> {
  const response = await request(app.getHttpServer())
    .post(path)
    .auth(inject('settings').WORKER_TOKEN, { type: 'bearer' })
    .send(data);
  const { message } = refusalSchema.parse(response.body);
  return typeof message === 'string' ? message : message.join('; ');
}
