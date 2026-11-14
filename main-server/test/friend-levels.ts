/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { type FriendLevel } from '../src/generated/prisma/client.js';
import { type TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';

// Every pair of ends of a friendship, the viewer's and the subject's, with what the viewer sees of the subject: the
// lower of the two.
export const LEVEL_PAIRS: [FriendLevel, FriendLevel, FriendLevel][] = [
  ['timetable', 'timetable', 'timetable'],
  ['timetable', 'building', 'timetable'],
  ['timetable', 'exact', 'timetable'],
  ['building', 'timetable', 'timetable'],
  ['building', 'building', 'building'],
  ['building', 'exact', 'building'],
  ['exact', 'timetable', 'timetable'],
  ['exact', 'building', 'building'],
  ['exact', 'exact', 'exact'],
];

// A hair from the point of 중앙도서관 (62), and on campus over 100 m from every Place. Each has more digits than the
// seed gives any Place, so that a text holding a person's own coordinates is found.
export const IN_LIBRARY = { latitude: 37.4594012345, longitude: 126.9519912345 };
export const IN_NO_PLACE = { latitude: 37.4590612345, longitude: 126.9569512345 };

const placeSchema = z.object({
  id: z.string(),
  number: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
});

export type SeedPlace = z.infer<typeof placeSchema>;

// The Place of that number, as GET /places gives it.
export async function placeNumbered(app: INestApplication<Server>, user: TestUser, number: string): Promise<SeedPlace> {
  const response = await withAccessToken(request(app.getHttpServer()).get('/places'), user.accessToken);
  const place = z
    .array(placeSchema)
    .parse(response.body)
    .find((each) => each.number === number);
  if (place === undefined) {
    throw new Error(`The seed has no Place numbered ${number}`);
  }
  return place;
}

// POST /friends/asked, as the app records that it asked about these Friends.
export function recordAsked(app: INestApplication<Server>, user: TestUser, body: object): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/friends/asked'), user.accessToken).send(body);
}

// The digits of the positions' coordinates that the values hold.
export function coordinatesIn(values: unknown, ...positions: { latitude: number; longitude: number }[]): string[] {
  const text = JSON.stringify(values);
  return positions
    .flatMap(({ latitude, longitude }) => [String(latitude), String(longitude)])
    .filter((digits) => text.includes(digits));
}
