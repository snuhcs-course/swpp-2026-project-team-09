/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
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
  // How they travel, absent for a walk. With the shuttle-aware Plan, 'shuttle' when their way to the place is by the
  // shuttle, `walkMinutes` then being the minutes of the way, and `shuttle` the names of the stops they board and get
  // off at ("301동", "경영대"). A main server before it sends neither for a meal, which reads as a walk.
  mode?: 'walk' | 'shuttle';
  shuttle?: { boardAt: string; getOffAt: string };
}

export interface DroppedPlace {
  place: PlacePoint;
  reason: string;
  // Each person's part there, given for the Place the input fixed ("여기면 어때?").
  parts?: PlanPart[];
}
