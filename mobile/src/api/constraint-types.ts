/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A person's constraint of a plan's input, as main-server `assistant/dto/plan-input.dto.ts` fixes it.

// `source` says who set it: the asker (words, a tap, a drag), the person it is about, or the step before it in the
// same steps (`step`), which the main server sets again whenever that step changes, to an app that says `answers`
// (P03 ticket 20). The app sends it back as it came.
export type ConstraintSource = 'asker' | 'person' | 'step';

export type PersonConstraint =
  | { kind: 'from'; placeId: string; source: ConstraintSource }
  | { kind: 'notBefore'; time: string; source: ConstraintSource }
  | { kind: 'leaveBy'; time: string; source: ConstraintSource };
