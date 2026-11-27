/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { InvitationCard } from '@/api/invitation-card-types';
import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import type { QuestInvitation } from '@/api/waiting-types';

// The invitation as the list of received invitations gives it: the stored card's own id, Quest, and time.
export const RECEIVED: QuestInvitation = {
  id: INVITATION_CARD.id,
  quest: INVITATION_CARD.quest,
  sentAt: INVITATION_CARD.sentAt,
  nextSubQuest: null,
};

// The stored card as the main server words it when nothing says where the User sets out from, which is its answer to
// a phone off campus, since the app sends no position from there (main-server `plans/own-way.ts`): status 'unknown',
// no origin, times, or meeting, no line, and a scene of the destination alone. Changed from the stored copy for the
// boundary.
export const UNKNOWN_WAY_CARD: InvitationCard = {
  ...INVITATION_CARD,
  way: {
    status: 'unknown',
    origin: null,
    leaveAt: null,
    walkMinutes: null,
    arriveAt: null,
    meeting: null,
    leaveBy: null,
    next: null,
    lines: [],
    scene: {
      people: [],
      places: INVITATION_CARD.way?.scene.places.filter(({ role }) => role === 'pick') ?? [],
      routes: [],
      flags: INVITATION_CARD.way?.scene.flags.filter(({ role }) => role === 'place') ?? [],
    },
  },
};
