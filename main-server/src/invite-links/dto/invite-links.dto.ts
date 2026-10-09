// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #40
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
