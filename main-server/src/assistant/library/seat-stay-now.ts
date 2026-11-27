/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Prisma } from '../../generated/prisma/client.js';
import { keptQuestsOf } from '../../quests/kept-quests.js';
import { koreaDate } from '../korea-time.js';

// A seat booked through the app's card is a seat-stay Quest (src/library/seat-stays.service.ts), which the app drops when
// the booking is cancelled or returned. A seat booked on the library's site has none.
export interface SeatStay {
  start: Date;
  end: Date | null;
}

// The User's seat stay of today a return is about (P05 ticket 59): of those not ended, the one under way, else the next
// to start; null for none.
export async function seatStayNow(
  db: Pick<Prisma.TransactionClient, 'quest'>,
  userId: string,
  now: Date,
): Promise<SeatStay | null> {
  const stays = (await keptQuestsOf(db, userId, { date: koreaDate(now), now })).filter(
    ({ kind, end }) => kind === 'seat' && (end === null || end > now),
  );
  const stay = stays.find(({ start }) => start <= now) ?? stays[0];
  return stay === undefined ? null : { start: stay.start, end: stay.end };
}
