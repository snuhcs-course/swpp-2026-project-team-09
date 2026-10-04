import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Matches any text, such as a time, in an expected value. Typed, so that lint lets it into an object.
export const ANY_STRING: unknown = expect.any(String);

// Sends the token as the main server does: MATCH_SERVER_TOKEN unless `token` names another, or none for `null`.
export function asMainServer(
  call: request.Test,
  token: string | null = inject('settings').MATCH_SERVER_TOKEN,
): request.Test {
  return token === null ? call : call.auth(token, { type: 'bearer' });
}

export function ask(app: INestApplication<Server>, userId: string, body: object): request.Test {
  return asMainServer(request(app.getHttpServer()).post(`/users/${userId}/matching-requests`)).send(body);
}

export function withdraw(app: INestApplication<Server>, userId: string, globalEventId: string): request.Test {
  return asMainServer(
    request(app.getHttpServer()).post(`/users/${userId}/matching-requests/${globalEventId}/withdraw`),
  );
}

export function readRequest(app: INestApplication<Server>, userId: string, globalEventId: string): request.Test {
  return asMainServer(request(app.getHttpServer()).get(`/users/${userId}/matching-requests/${globalEventId}`));
}

export function openRequests(app: INestApplication<Server>, userId: string): request.Test {
  return asMainServer(request(app.getHttpServer()).get(`/users/${userId}/matching-requests`));
}

// Only ticket 09's rounds write the states `matched` and `expired`, so the tests set them with a connection of their
// own.
export function connectToDatabase(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
}
