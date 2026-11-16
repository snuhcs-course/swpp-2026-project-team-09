/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { clockTime } from '../free-time/tool-parts.js';

// A meal's conditions that cannot be met (P02-14, board n11), declared with the same shapes in the app's
// `relax-types.ts`.

// A button of a meal that nothing fits 지금: the app eases one condition of the input and recalculates, without the
// model. `without` leaves a Friend out; `from` starts the plan at `time` (HH:MM), when everyone is free next.
export type RelaxOffer =
  { kind: 'without'; userId: string; label: string } | { kind: 'from'; time: string; label: string };

// A meal's window: the start and end the User fixed, and `now` when they said 지금.
export const mealWindowSchema = z
  .strictObject({ from: clockTime.nullable(), until: clockTime.nullable(), now: z.boolean().optional() })
  .refine(({ from, until }) => from === null || until === null || from < until, 'Expected from before until');
