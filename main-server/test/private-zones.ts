/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { type Position } from '../src/common/geometry.js';
import { type TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';

type SignedIn = Pick<TestUser, 'accessToken'>;

export function addZone(app: INestApplication<Server>, user: SignedIn, body: object): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/users/me/private-zones'), user.accessToken).send(body);
}

export function listZones(app: INestApplication<Server>, user: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/users/me/private-zones'), user.accessToken);
}

export function deleteZone(app: INestApplication<Server>, user: SignedIn, id: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).delete(`/users/me/private-zones/${id}`), user.accessToken);
}

const placeSchema = z.object({
  id: z.string(),
  number: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
});

// The point of the Place of that number, as GET /places gives it.
export async function placePoint(app: INestApplication<Server>, user: SignedIn, number: string): Promise<Position> {
  const response = await withAccessToken(request(app.getHttpServer()).get('/places'), user.accessToken);
  const place = z
    .array(placeSchema)
    .parse(response.body)
    .find((each) => each.number === number);
  if (place === undefined) {
    throw new Error(`The seed has no Place numbered ${number}`);
  }
  return { latitude: place.latitude, longitude: place.longitude };
}
