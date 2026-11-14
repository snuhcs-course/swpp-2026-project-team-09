/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, MapScene, PlacePoint } from './assistant-types';
import type { SubQuest } from './types';
import type { QuestSummary } from './waiting-types';

// GET /quest-invitations/:id: an invitation as the invited User opens it, as main-server
// `plans/dto/invitation-card.dto.ts` fixes it. The gathering's and the way's times are Korea time with the offset.
export interface InvitationCard {
  id: string;
  sentAt: string;
  quest: QuestSummary;
  // The Leader first, then in the order they entered.
  holders: { id: string; name: string }[];
  // In the order of their starts, those without one last.
  steps: Pick<SubQuest, 'id' | 'title' | 'startsAt' | 'endsAt' | 'place'>[];
  // The Quest's destination step. Null when no step ahead has a start and a Place of the list.
  gathering: { place: PlacePoint; startAt: string; endAt: string | null } | null;
  // Null when there is no gathering.
  way: OwnWay | null;
}

// The invitee's own way to the gathering, which nobody else is ever sent.
export interface OwnWay {
  status: 'ok' | 'unknown' | 'off-campus' | 'busy';
  origin: { place: PlacePoint; basis: 'timetable' | 'location' } | null;
  leaveAt: string | null;
  // Through the Merging Point when they take it.
  walkMinutes: number | null;
  // The gathering's start, or later when they cannot make it.
  arriveAt: string | null;
  meeting: { place: PlacePoint; at: string } | null;
  leaveBy: string | null;
  next: { startAt: string; place: PlacePoint | null } | null;
  // At most two.
  lines: AnswerLine[];
  scene: MapScene;
}
