/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { type Template } from '../src/assistant/suggestions/constants.js';
import { type Bucket } from '../src/assistant/suggestions/scoring.js';
import { JoinPolicy, Place, PrismaClient, QuestBoard, SuggestionOutcome } from '../src/generated/prisma/client.js';
import { TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';
import { addClass } from './timetable.js';

// The grey suggestions' routes as the app calls them, and what their tests store with a connection of their own.

const MAIN_SCREEN = { screen: 'main' };

// Matches any impression id in an expected value. Typed, so that lint lets it into an object.
export const AN_ID: unknown = expect.any(String);

export function getSuggestion(
  app: INestApplication<Server>,
  user: TestUser,
  query: Record<string, string> = MAIN_SCREEN,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/assistant/suggestion'), user.accessToken).query(query);
}

export function postOutcome(app: INestApplication<Server>, user: TestUser, id: string, body: object): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).post(`/assistant/suggestions/${id}/outcome`),
    user.accessToken,
  ).send(body);
}

const suggestionSchema = z.strictObject({
  id: z.uuid(),
  text: z.string(),
  reason: z.string(),
  action: z.union([
    z.strictObject({ type: z.literal('proposal'), proposal: z.record(z.string(), z.unknown()) }),
    z.strictObject({ type: z.literal('route'), placeId: z.uuid(), name: z.string() }),
  ]),
});

export type Suggestion = z.infer<typeof suggestionSchema>;

// The suggestion the User is answered, checked against the route's shape, or null.
export async function suggestionFor(
  app: INestApplication<Server>,
  user: TestUser,
  query?: Record<string, string>,
): Promise<Suggestion | null> {
  const response = await getSuggestion(app, user, query);
  expect(response.status).toBe(200);
  return z.strictObject({ suggestion: suggestionSchema.nullable() }).parse(response.body).suggestion;
}

// A time in Korea: `day` is `YYYY-MM-DD` and `time` `HH:MM`.
export function korea(day: string, time: string): Date {
  return new Date(`${day}T${time}:00+09:00`);
}

// The day `weeks` weeks after `day`, on the same weekday. Six weeks apart, a test's impressions fall outside another's
// window of acceptance.
export function weeksAfter(day: string, weeks: number): string {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// A class of the User's held on Monday from `startTime` to `endTime`, at the Place given.
export async function mondayClass(
  app: INestApplication<Server>,
  user: TestUser,
  startTime: string,
  endTime: string,
  placeId: string | null = null,
): Promise<void> {
  await addClass(app, user.accessToken, {
    courseName: '자료구조',
    times: [{ weekday: 'monday', startTime, endTime, placeId, room: null }],
  });
}

// Two Places of the seed, which every database has.
export async function twoPlaces(prisma: PrismaClient): Promise<[Place, Place]> {
  const [first, second] = await Promise.all([
    prisma.place.findFirstOrThrow({ where: { number: '301' } }),
    prisma.place.findFirstOrThrow({ where: { number: '302' } }),
  ]);
  return [first, second];
}

// A Quest the User led, whose one Sub Quest started at `startsAt` at the Place, Open on the meal Board unless changed.
export async function storeLedQuest(
  prisma: PrismaClient,
  leaderId: string,
  startsAt: Date,
  placeId: string,
  changes: { joinPolicy?: JoinPolicy; board?: QuestBoard | null; holderIds?: string[] } = {},
): Promise<string> {
  const { joinPolicy = JoinPolicy.open, board = QuestBoard.meal, holderIds = [] } = changes;
  const quest = await prisma.quest.create({
    data: {
      title: '점심 같이 먹어요',
      leaderId,
      joinPolicy,
      board,
      capacity: 4,
      description: '학생회관에서 같이 먹어요',
      holders: { create: [leaderId, ...holderIds].map((userId) => ({ userId })) },
      subQuests: { create: { title: '점심', startsAt, placeId } },
    },
  });
  return quest.id;
}

// Impressions of a template in a bucket, `shown` in all of which `accepted` were accepted, as other Users' would be.
export async function storeImpressions(
  prisma: PrismaClient,
  userId: string,
  template: Template,
  bucket: Bucket,
  shownAt: Date,
  { shown, accepted }: { shown: number; accepted: number },
): Promise<void> {
  await prisma.suggestionImpression.createMany({
    data: Array.from({ length: shown }, (_, index) => ({
      userId,
      template,
      eligible: [template],
      bucket,
      propensity: 1,
      holdback: false,
      shownAt,
      outcome: index < accepted ? SuggestionOutcome.accepted : SuggestionOutcome.dismissed,
      outcomeAt: shownAt,
    })),
  });
}
