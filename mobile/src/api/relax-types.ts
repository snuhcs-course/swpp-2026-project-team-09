/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Conditions that cannot be met (P02-14), the same shapes as main-server `assistant/refusals/relax.dto.ts` and the
// meal's window of `assistant/dto/answer.dto.ts`.

// A button of a meal that nothing fits 지금: `without` leaves a Friend out, `from` starts the plan at `time` (HH:MM).
export type RelaxOffer =
  { kind: 'without'; userId: string; label: string } | { kind: 'from'; time: string; label: string };

// The part of an answer's noPlan when nothing fits 지금. A main server before P02-14 leaves it out.
export interface WithRelax {
  relax?: RelaxOffer[];
}

// A meal's window: what the User fixed, and `now` when they said 지금; with `from` too, 지금 was eased to it.
export interface MealWindow {
  from: string | null;
  until: string | null;
  now?: boolean;
}
