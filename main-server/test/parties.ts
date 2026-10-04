import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';

type SignedIn = Pick<TestUser, 'accessToken'>;

export function createParty(app: INestApplication<Server>, user: SignedIn, body: object = {}): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/parties'), user.accessToken).send({
    title: '같이 가요',
    joinPolicy: 'open',
    ...body,
  });
}

export function joinParty(app: INestApplication<Server>, user: SignedIn, partyId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post(`/parties/${partyId}/join`), user.accessToken);
}

export function getMyParty(app: INestApplication<Server>, user: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/parties/mine'), user.accessToken);
}

export function leaveParty(app: INestApplication<Server>, user: SignedIn): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/parties/mine/leave'), user.accessToken);
}

export function setPartySharing(app: INestApplication<Server>, user: SignedIn, on: boolean): request.Test {
  return withAccessToken(request(app.getHttpServer()).put('/parties/mine/sharing'), user.accessToken).send({ on });
}

export function listParties(app: INestApplication<Server>, user: SignedIn, globalEventId?: string): request.Test {
  const call = withAccessToken(request(app.getHttpServer()).get('/parties'), user.accessToken);
  return globalEventId === undefined ? call : call.query({ globalEventId });
}

// Creates a Party and answers its id.
export async function partyOf(app: INestApplication<Server>, user: SignedIn, body: object = {}): Promise<string> {
  const response = await createParty(app, user, body);
  if (response.status !== 201) {
    throw new Error(`Creating a Party answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z.object({ id: z.string() }).parse(response.body).id;
}

// Joins the Party, or throws.
export async function enter(app: INestApplication<Server>, user: SignedIn, partyId: string): Promise<void> {
  const response = await joinParty(app, user, partyId);
  if (response.status !== 201) {
    throw new Error(`Joining a Party answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
}

// The ids of the Parties in a list, in its order.
export async function listedIds(
  app: INestApplication<Server>,
  user: SignedIn,
  globalEventId?: string,
): Promise<string[]> {
  const response = await listParties(app, user, globalEventId);
  return z
    .array(z.object({ id: z.string() }))
    .parse(response.body)
    .map(({ id }) => id);
}
