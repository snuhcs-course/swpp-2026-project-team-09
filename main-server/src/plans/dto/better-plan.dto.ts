/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlacePoint, type Plan, type PlanInput } from '../../assistant/dto/answer.dto.js';

// What the Leader is offered after a decline, declared with the same shape in the app's plan-quest-types.ts. All three
// are null when the Quest has no destination step in a meal's window.
export interface BetterPlanDto {
  // The Quest's destination step as it stands, its times Korea time with the offset.
  current: { place: PlacePoint; startAt: string; endAt: string; togetherMinutes: number } | null;
  better: Plan | null;
  // Sent back with the better Plan's id and start to change the Quest to it.
  input: PlanInput | null;
}
