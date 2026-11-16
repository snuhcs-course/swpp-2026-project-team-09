/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlacePoint } from './assistant-types';

// Each person's part of a Plan, and a Place that does not fit (main-server `assistant/dto/answer.dto.ts`, the same
// shape), as `Plan` and `AnswerReply` hold them.

export interface PlanPart {
  userId: string;
  name: string;
  me: boolean;
  // Null when the position is unknown.
  origin: { place: PlacePoint; basis: 'timetable' | 'location' | 'chosen' } | null;
  leaveAt: string | null;
  walkMinutes: number | null;
  // The earliest they can be at the place, null when the position is unknown. Given by a meal's and a meet's Plans.
  arriveAt?: string | null;
  // Null when nothing follows.
  leaveBy: string | null;
  next: { startAt: string; place: PlacePoint | null } | null;
  // How they travel, absent for a walk.
  mode?: 'walk' | 'shuttle';
}

export interface DroppedPlace {
  place: PlacePoint;
  reason: string;
  // Each person's part there, given for the Place the input fixed ("여기면 어때?").
  parts?: PlanPart[];
}
