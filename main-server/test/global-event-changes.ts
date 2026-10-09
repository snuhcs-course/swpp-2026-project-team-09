// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { type EventDetail, eventDetailSchema } from './global-event-lists.js';
import { withAccessToken } from './sign-in.js';

// With a new Idempotency-Key unless one is given, as the admin site sends it.
export function postGlobalEvent(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  body: object,
  key: string | null = randomUUID(),
): request.Test {
  const call = withAccessToken(request(app.getHttpServer()).post('/admin/global-events'), accessToken).send(body);
  return key === null ? call : call.set('Idempotency-Key', key);
}

// Creates a Draft with `fields` over a title and an empty description, and answers it.
export async function createDraft(
  app: INestApplication<Server>,
  accessToken: string,
  fields: object = {},
): Promise<EventDetail> {
  const response = await postGlobalEvent(app, accessToken, { title: '동아리 박람회', description: '', ...fields });
  if (response.status !== 201) {
    throw new Error(`Creating a Global Event answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return eventDetailSchema.parse(response.body);
}

export function patchGlobalEvent(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  id: string,
  body: object,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).patch(`/admin/global-events/${id}`), accessToken).send(body);
}

export type StateChange = 'publish' | 'discard' | 'cancel';

export function changeState(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  id: string,
  change: StateChange,
  version: number,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).post(`/admin/global-events/${id}/${change}`), accessToken).send({
    version,
  });
}
