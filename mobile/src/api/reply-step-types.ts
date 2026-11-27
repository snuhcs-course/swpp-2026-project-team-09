/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlacePoint, PlanInput } from './assistant-types';

// One request of a message that asked for several (P03): a seat or room booked through a library card, or the plan
// drawn on the map. A reply carries its steps, in time order, only when there are two or more.
export interface ReplyStep {
  kind: 'seat' | 'room' | PlanInput['kind'];
  // What it is, in words: "7층 7A 열람실 2 구역", "학생회관식당에서 저녁".
  title: string;
  place: PlacePoint | null;
  // Where the User sets out from for it: the place of the step before it, unless they named another.
  from: PlacePoint | null;
  // Korea time with the offset; null when the step has no time.
  startAt: string | null;
  endAt: string | null;
  // `shown`: its card or its answer is in the reply. `not-done`: it could not be done, for `reason`.
  status: 'shown' | 'not-done';
  reason: string | null;
  // Where the reply shows it: the library card of that key, or the answer.
  shows: { kind: 'card'; key: string } | { kind: 'answer' } | null;
}
