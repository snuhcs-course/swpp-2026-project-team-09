/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanPerson } from './assistant-types';

// The conditions of a meet drawn on the map (main-server `assistant/dto/answer.dto.ts`, the same shape), a member of
// the union `PlanInput`.

// When the asker and their Friends are free together that day, and where they meet.
export interface MeetInput {
  kind: 'meet';
  // YYYY-MM-DD in Korea.
  date: string;
  // The asker first, then the Friends.
  people: PlanPerson[];
  window: { from: string | null; until: string | null };
  placeId: string | null;
}
