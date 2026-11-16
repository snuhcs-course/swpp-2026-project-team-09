/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Prisma } from '../generated/prisma/client.js';
import { type SubQuestContentDto } from './dto/quest-requests.dto.js';
import { type SubQuestColumns } from './quests.service.js';
import { notFound } from './refusals.js';

// What a Sub Quest a Holder writes stores. Refuses a Place that is not in the list.
export async function columnsOf(
  { title, startsAt, endsAt, place }: SubQuestContentDto,
  tx: Prisma.TransactionClient,
): Promise<SubQuestColumns> {
  const point = place !== null && 'latitude' in place ? place : null;
  const placeId = place !== null && 'placeId' in place ? place.placeId : null;
  if (placeId !== null && (await tx.place.findUnique({ where: { id: placeId } })) === null) {
    throw notFound('PLACE_NOT_FOUND', 'No such Place is in the list.');
  }
  return {
    title,
    startsAt: startsAt === null ? null : new Date(startsAt),
    endsAt: endsAt === null ? null : new Date(endsAt),
    placeId,
    latitude: point?.latitude ?? null,
    longitude: point?.longitude ?? null,
    placeLabel: place !== null && 'label' in place ? place.label : null,
  };
}
