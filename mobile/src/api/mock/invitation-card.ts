/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { InvitationCard } from '@/api/invitation-card-types';
import { INVITATION_CARD } from './data/invitation-card';

// Every invitation opens as the main server's real card for 민수 in the worked example, under the id asked for.
export function mockInvitationCard(invitationId: string): InvitationCard {
  return { ...INVITATION_CARD, id: invitationId };
}
