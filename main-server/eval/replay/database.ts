/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { type PlaceDto, toPlaceDto } from '../../src/places/dto/place.dto.js';
import { byNumber } from '../../src/places/places.service.js';

// The database the replay reads: DATABASE_URL, from the environment or main-server/.env. It only reads.

export function connectToDatabase(env: NodeJS.ProcessEnv = process.env): PrismaClient {
  const url = env.DATABASE_URL ?? '';
  if (url === '') {
    throw new Error('Set DATABASE_URL, in the environment or in main-server/.env, to the database to replay.');
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

// The Places as PlacesService.list gives them.
export async function catalogOf(prisma: PrismaClient): Promise<PlaceDto[]> {
  return (await prisma.place.findMany()).toSorted(byNumber).map((place) => toPlaceDto(place));
}
