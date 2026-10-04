import { Prisma } from '../../generated/prisma/client.js';
import { LISTED_PARTY_INCLUDE, ListedPartyDto, toListedPartyDto, USER_SUMMARY, UserSummaryDto } from './party.dto.js';

// An invitation as the invited User lists it, with the Party and its Leader now.
export interface InvitationDto {
  id: string;
  party: ListedPartyDto;
  leader: UserSummaryDto;
  sentAt: string;
}

export const INVITATION_INCLUDE = {
  party: { include: { ...LISTED_PARTY_INCLUDE, leader: USER_SUMMARY } },
} satisfies Prisma.PartyInvitationInclude;

export function toInvitationDto(
  invitation: Prisma.PartyInvitationGetPayload<{ include: typeof INVITATION_INCLUDE }>,
): InvitationDto {
  return {
    id: invitation.id,
    party: toListedPartyDto(invitation.party),
    leader: invitation.party.leader,
    sentAt: invitation.sentAt.toISOString(),
  };
}
