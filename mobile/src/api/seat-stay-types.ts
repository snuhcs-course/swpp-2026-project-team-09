/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Quest } from './types';

// A seat booked on the library's site, told to the main server (POST /library/seat-stays), as main-server
// `library/dto/seat-stay.dto.ts` declares it. The seat and the booking number stay on the phone.

export interface SeatStay {
  spaceId: string;
  // "YYYY-MM-DD", "HH:MM" and minutes.
  date: string;
  start: string;
  minutes: number;
}

export interface SeatStayMade {
  // The stay, a Quest the User holds alone.
  quest: Quest;
  // When the User is told to leave for their next item, or null when no leave-by is kept.
  leaveAt: string | null;
}
