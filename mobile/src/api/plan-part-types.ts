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
  // `by`: how they go on to it, absent from a main server before the shuttle-aware Plan (a walk).
  next: { startAt: string; place: PlacePoint | null; by?: 'walk' | 'shuttle' } | null;
  // How they travel, absent for a walk.
  mode?: 'walk' | 'shuttle';
  // How they go to the place, and with the shuttle where they board and get off; absent from a main server before the
  // shuttle-aware Plan, which reads as a walk. `walkMinutes` is then the minutes of the way, however it is gone.
  by?: 'walk' | 'shuttle';
  shuttle?: { boardAt: string; getOffAt: string };
}

export interface DroppedPlace {
  place: PlacePoint;
  reason: string;
  // Each person's part there, given for the Place the input fixed ("여기면 어때?").
  parts?: PlanPart[];
}
