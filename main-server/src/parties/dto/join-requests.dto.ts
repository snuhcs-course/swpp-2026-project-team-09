/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client.js';
import {
  toVisiblePartyDto,
  USER_SUMMARY,
  UserSummaryDto,
  VisibleParty,
  visiblePartyInclude,
  VisiblePartyInclude,
  VisiblePartyDto,
} from './party.dto.js';

export const askToJoinSchema = z.strictObject({ partyId: z.uuid() });

export type AskToJoinDto = z.infer<typeof askToJoinSchema>;

// A request as the User who asked lists it, with the Party as their list of Parties shows it.
export interface SentJoinRequestDto {
  id: string;
  party: VisiblePartyDto;
  sentAt: string;
}

// A request as the Leader lists it.
export interface ReceivedJoinRequestDto {
  id: string;
  user: UserSummaryDto;
  sentAt: string;
}

// As the User `readerId` who asked reads it.
export function sentJoinRequestInclude(readerId: string): { party: { include: VisiblePartyInclude } } {
  return { party: { include: visiblePartyInclude(readerId) } } satisfies Prisma.PartyJoinRequestInclude;
}

// As the reader of sentJoinRequestInclude, a Friend of the Users `friendIds`, reads it.
export function toSentJoinRequestDto(
  request: { id: string; party: VisibleParty; sentAt: Date },
  friendIds: ReadonlySet<string>,
): SentJoinRequestDto {
  return { id: request.id, party: toVisiblePartyDto(request.party, friendIds), sentAt: request.sentAt.toISOString() };
}

export function toReceivedJoinRequestDto(
  request: Prisma.PartyJoinRequestGetPayload<{ include: { user: typeof USER_SUMMARY } }>,
): ReceivedJoinRequestDto {
  return { id: request.id, user: request.user, sentAt: request.sentAt.toISOString() };
}
