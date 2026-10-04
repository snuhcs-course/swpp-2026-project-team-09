import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client.js';
import { LISTED_PARTY_INCLUDE, ListedPartyDto, toListedPartyDto, USER_SUMMARY, UserSummaryDto } from './party.dto.js';

export const askToJoinSchema = z.strictObject({ partyId: z.uuid() });

export type AskToJoinDto = z.infer<typeof askToJoinSchema>;

// A request as the User who asked lists it.
export interface SentJoinRequestDto {
  id: string;
  party: ListedPartyDto;
  sentAt: string;
}

// A request as the Leader lists it.
export interface ReceivedJoinRequestDto {
  id: string;
  user: UserSummaryDto;
  sentAt: string;
}

export const SENT_JOIN_REQUEST_INCLUDE = {
  party: { include: LISTED_PARTY_INCLUDE },
} satisfies Prisma.PartyJoinRequestInclude;

export function toSentJoinRequestDto(
  request: Prisma.PartyJoinRequestGetPayload<{ include: typeof SENT_JOIN_REQUEST_INCLUDE }>,
): SentJoinRequestDto {
  return { id: request.id, party: toListedPartyDto(request.party), sentAt: request.sentAt.toISOString() };
}

export function toReceivedJoinRequestDto(
  request: Prisma.PartyJoinRequestGetPayload<{ include: { user: typeof USER_SUMMARY } }>,
): ReceivedJoinRequestDto {
  return { id: request.id, user: request.user, sentAt: request.sentAt.toISOString() };
}
