/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

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
  publishedAt: z.iso.datetime().nullable(),
  favorite: z.boolean(),
});

export type PublishedEvent = z.infer<typeof publishedEventSchema>;

export function getGlobalEvents(app: INestApplication<Server>, accessToken: string | undefined): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/global-events'), accessToken);
}

// PUT stars the event for the User; with `favorite` false, DELETE clears the star.
export function setFavorite(
  app: INestApplication<Server>,
  accessToken: string,
  id: string,
  favorite = true,
): request.Test {
  const server = request(app.getHttpServer());
  const path = `/global-events/${id}/favorite`;
  return withAccessToken(favorite ? server.put(path) : server.delete(path), accessToken);
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
  source: z.enum(['snu_events', 'extra_snu']).nullable(),
  postKey: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  publicationRoute: z.enum(['administrator', 'rule', 'judgement']).nullable(),
  needsAdministrator: z.boolean(),
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
// Its Judgement's shape is tested by test/judgement-publication.integration.test.ts.
export const eventDetailSchema = listedEventSchema.extend({
  description: z.string(),
  judgement: z.looseObject({}).nullable(),
});

export type EventDetail = z.infer<typeof eventDetailSchema>;

export function getAdminGlobalEvent(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  id: string,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).get(`/admin/global-events/${id}`), accessToken);
}
