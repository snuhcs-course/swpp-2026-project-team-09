/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { UserSummaryDto } from '../../friends/dto/friends.dto.js';

export interface CreatedInviteLinkDto {
  url: string;
  expiresAt: string;
}

// Whether the User asking can accept the link: 'own' is the User's own link, and 'friend' one from a Friend.
export type InviteLinkStatus = 'usable' | 'used' | 'expired' | 'own' | 'friend';

export interface InviteLinkDto {
  sender: UserSummaryDto;
  status: InviteLinkStatus;
}
