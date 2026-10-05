import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
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

// Only the rounds write the states `matched` and `expired`, so the tests of the routes set them with a connection of
// their own.
export function connectToDatabase(databaseUrl = inject('settings').DATABASE_URL): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

const candidateSchema = z.object({ userId: z.string(), globalEventId: z.string() });
const standingQuestionSchema = z.object({ requests: z.array(candidateSchema) });
const questRequestSchema = z.object({ globalEventId: z.string(), userIds: z.array(z.string()) });
const eligibleQuestionSchema = z.object({ pools: z.array(z.object({ globalEventId: z.string(), size: z.number() })) });
const placementSchema = z.object({ questId: z.string(), userId: z.string(), size: z.number() });

export type Placement = z.infer<typeof placementSchema>;

// An Open Quest the main server answers as eligible.
export interface EligibleQuest {
  id: string;
  globalEventId: string;
  capacity: number;
  freePlaces: number;
  holderIds: string[];
  createdAt: string;
}

// An answer of the main server with its status, or none, as from a main server that is down.
export type Reply = { status: number; body: object } | null;

export interface MainServerCall {
  path: string;
  body: unknown;
  authorization: string | null;
}

// A refusal with a code, as the main server gives one.
export function refusal(status: 404 | 409, code: string): Reply {
  const error = status === 404 ? 'Not Found' : 'Conflict';
  return { status, body: { statusCode: status, error, code, message: `Refused: ${code}` } };
}

// Stands for the main server: answers the calls of the rounds as a test sets, and keeps each call.
export class MainServerStub {
  readonly calls: MainServerCall[] = [];
  // Which requests stand: every one, unless a test says otherwise.
  standing: (requests: z.infer<typeof candidateSchema>[]) => Reply | Promise<Reply> = (requests) => ({
    status: 200,
    body: { standing: requests },
  });
  // The answer to a request for a match's Quest: unless a test says otherwise, a Quest held by every matched User, the
  // same one for each repeat.
  quest: (matchId: string, userIds: string[]) => Reply = (matchId, userIds) => ({
    status: 201,
    body: { questId: this.questIdOf(matchId), holderIds: userIds },
  });
  // The eligible Quests: none, unless a test says otherwise.
  eligible: (pools: z.infer<typeof eligibleQuestionSchema>['pools']) => Reply = () => ({
    status: 200,
    body: { quests: [] },
  });
  // The answer to a placement: unless a test says otherwise, the User entered.
  placement: (placement: Placement) => Reply = ({ questId, userId }) => ({
    status: 201,
    body: { questId, holderIds: [userId] },
  });
  private readonly questIds = new Map<string, string>();

  // The Quest the stub creates for the match.
  questIdOf(matchId: string): string {
    const questId = this.questIds.get(matchId) ?? randomUUID();
    this.questIds.set(matchId, questId);
    return questId;
  }

  // The requests for a match's Quest.
  questCalls(): MainServerCall[] {
    return this.calls.filter(({ path }) => path.startsWith('/matches/'));
  }

  // The placements asked for, in order.
  placements(): Placement[] {
    return this.calls
      .filter(({ path }) => path === '/matching-requests/placements')
      .map(({ body }) => placementSchema.parse(body));
  }

  // Give it to startApp in place of the HTTP call to the main server.
  readonly fetch: typeof fetch = async (input, init) => {
    const { pathname } = new URL(input instanceof Request ? input.url : String(input));
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    this.calls.push({ path: pathname, body, authorization: new Headers(init?.headers).get('Authorization') });
    const matchId = /^\/matches\/(?<matchId>[^/]+)\/quest$/u.exec(pathname)?.groups?.['matchId'];
    let reply: Reply = null;
    if (pathname === '/matching-requests/standing') {
      reply = await this.standing(standingQuestionSchema.parse(body).requests);
    } else if (pathname === '/matching-requests/eligible-quests') {
      reply = this.eligible(eligibleQuestionSchema.parse(body).pools);
    } else if (pathname === '/matching-requests/placements') {
      reply = this.placement(placementSchema.parse(body));
    } else if (matchId !== undefined) {
      reply = this.quest(matchId, questRequestSchema.parse(body).userIds);
    }
    if (reply === null) {
      throw new Error('connect ECONNREFUSED');
    }
    return Response.json(reply.body, { status: reply.status });
  };
}
