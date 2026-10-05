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

// An invitation as the invited User lists it, with the Party as their list of Parties shows it and its Leader now.
export interface InvitationDto {
  id: string;
  party: VisiblePartyDto;
  leader: UserSummaryDto;
  sentAt: string;
}

// As the invited User `readerId` reads it.
export function invitationInclude(readerId: string): {
  party: { include: VisiblePartyInclude & { leader: typeof USER_SUMMARY } };
} {
  return {
    party: { include: { ...visiblePartyInclude(readerId), leader: USER_SUMMARY } },
  } satisfies Prisma.PartyInvitationInclude;
}

// As the reader of invitationInclude, a Friend of the Users `friendIds`, reads it.
export function toInvitationDto(
  invitation: { id: string; party: VisibleParty & { leader: UserSummaryDto }; sentAt: Date },
  friendIds: ReadonlySet<string>,
): InvitationDto {
  return {
    id: invitation.id,
    party: toVisiblePartyDto(invitation.party, friendIds),
    leader: invitation.party.leader,
    sentAt: invitation.sentAt.toISOString(),
  };
}
