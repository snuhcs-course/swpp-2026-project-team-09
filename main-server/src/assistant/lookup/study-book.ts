/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlanStudy } from '../dto/study-plan.dto.js';
import { clockOf } from '../free-time/free-time.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { koreaDate } from '../korea-time.js';
import { clockOfMinutes, minutesOfClock } from '../library/booking-rules.js';
import { type Catalogue } from '../library/catalogue.js';
import { bookCard } from '../library/library-card.js';

// The seat 관정관's plan books, with the card the app opens for it in the plan (P10 ticket 21): the card
// proposeLibraryBooking shows for that space at the plan's day, start and length, the start moved up and the length
// down onto the space's steps, the length within the space's shortest and longest. Null for a space the catalogue
// lacks.
export function studyBookOf(
  spaceId: string,
  catalogue: Catalogue,
  { start, end }: { start: Date; end: Date },
): PlanStudy['book'] {
  const space = catalogue.byId.get(spaceId);
  if (space === undefined) {
    return null;
  }
  const { stepMinutes: step, minMinutes, maxMinutes } = space;
  const begin = minutesOfClock(clockOf(start));
  const from = Math.ceil(begin / step) * step;
  const until = begin + Math.floor((end.getTime() - start.getTime()) / MINUTE_MS);
  const minutes = Math.min(maxMinutes, Math.max(minMinutes, Math.floor((until - from) / step) * step));
  const card = bookCard(space, {
    date: koreaDate(start),
    start: clockOfMinutes(from),
    minutes,
    seat: null,
    equipment: null,
    useDesc: null,
    companions: [],
    questId: null,
  });
  return { spaceId, card: card.library };
}

// The seat a plan books (`seatToBook`), with its card; null for none.
export const studyBookFor = (
  seat: { spaceId: string } | null,
  catalogue: Catalogue,
  span: { start: Date; end: Date },
): PlanStudy['book'] => (seat === null ? null : studyBookOf(seat.spaceId, catalogue, span));
