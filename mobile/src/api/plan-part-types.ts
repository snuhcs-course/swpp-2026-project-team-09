/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
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
  // Each person's part there, given for the Place the input fixed (`placeId`).
  parts?: PlanPart[];
}

// A Restaurant closed for the meal by its menu's notice (P04 ticket 71): its Place, and the notice in its own lines
// ("공대수시면접으로 인해 휴점합니다"). No candidate: the list names it apart.
export interface ClosedPlace {
  place: PlacePoint;
  notices: string[];
}

// A meal answer's Friends whom its plans add to the meal the User holds (`planSet`, P05 ticket 44): those added (not
// those already in it), the Quest's start in Korea time with its offset, and the first plan's start when it moves, else
// null. The answer's `adding`, absent otherwise and from a main server before it.
export interface AddingFriends {
  friends: { userId: string; name: string }[];
  startAt: string;
  movesTo: string | null;
}

// A meal answer's `adding` (P05 ticket 44).
export interface WithAdding {
  adding?: AddingFriends | null;
}
