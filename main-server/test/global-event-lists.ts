import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { withAccessToken } from './sign-in.js';

// A published Global Event as a User's list serves it, exactly.
export const publishedEventSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
  place: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  sourceUrl: z.string().nullable(),
});

export type PublishedEvent = z.infer<typeof publishedEventSchema>;

export function getGlobalEvents(app: INestApplication<Server>, accessToken: string | undefined): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/global-events'), accessToken);
}

// The User's list, of which only the events in `ids` are kept, in the list's order: the test files share the database.
export async function publishedAmong(
  app: INestApplication<Server>,
  accessToken: string,
  ids: string[],
): Promise<PublishedEvent[]> {
  const response = await getGlobalEvents(app, accessToken);
  if (response.status !== 200) {
    throw new Error(`GET /global-events answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z
    .array(publishedEventSchema)
    .parse(response.body)
    .filter(({ id }) => ids.includes(id));
}

// An entry of an Administrator's list, exactly.
export const listedEventSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
  place: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  state: z.enum(['draft', 'published', 'cancelled', 'discarded']),
  version: z.number(),
  postNumber: z.number().nullable(),
  sourceUrl: z.string().nullable(),
  missing: z.array(z.enum(['startsAt', 'position'])),
});

export type ListedEvent = z.infer<typeof listedEventSchema>;

export function getAdminGlobalEvents(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  query: object,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/admin/global-events').query(query), accessToken);
}

// An Administrator's list of the events in `state`, of which only those in `ids` are kept, in the list's order.
export async function listedAmong(
  app: INestApplication<Server>,
  accessToken: string,
  state: 'draft' | 'published',
  ids: string[],
): Promise<ListedEvent[]> {
  const response = await getAdminGlobalEvents(app, accessToken, { state });
  if (response.status !== 200) {
    throw new Error(`GET /admin/global-events answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z
    .array(listedEventSchema)
    .parse(response.body)
    .filter(({ id }) => ids.includes(id));
}

// An event as an Administrator reads it alone, exactly.
export const eventDetailSchema = listedEventSchema.extend({ description: z.string() });

export function getAdminGlobalEvent(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  id: string,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).get(`/admin/global-events/${id}`), accessToken);
}
