/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { recalculationSchema } from '../../assistant/dto/answer.dto.js';

export const LATE_MINUTES_MAX = 120;

// A Holder's report of being late, declared with the same shape in the app's late-types.ts. The location is where the
// phone is now, and goes to nobody.
export const lateSchema = z.strictObject({
  minutes: z.int().min(1).max(LATE_MINUTES_MAX),
  location: recalculationSchema.shape.location,
});

export type LateBody = z.infer<typeof lateSchema>;

// The signal `late` to the other Holders: the minutes and the arrival that follows, never where the Holder is.
export interface LateSignal {
  questId: string;
  userId: string;
  minutes: number;
  // Korea time with the offset; null when the Holder's way has no arrival.
  arriveAt: string | null;
}
