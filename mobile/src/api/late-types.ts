/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from './types';

// POST /quests/:questId/late: a Holder reports being late, as main-server `plans/dto/late.dto.ts` fixes it. The reply
// is the Holder's own way as it now is (`OwnWay`). `minutes` is a whole number from 1 to 120; the location is where the
// phone is now, and goes to nobody.
export interface LateReport {
  minutes: number;
  location: LatLng | null;
}

// The signal `late` to the other Holders: the minutes and the arrival that follows, never where the Holder is.
export interface LateSignal {
  questId: string;
  userId: string;
  minutes: number;
  // Korea time with the offset; null when the Holder's way has no arrival.
  arriveAt: string | null;
}
