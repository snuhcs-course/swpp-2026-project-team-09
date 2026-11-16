/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem } from '../assistant/free-time/free-time.js';

const MINUTE_MS = 60_000;

export interface SeatStay {
  startsAt: Date;
  endsAt: Date;
  // 관정관's Place.
  placeId: string;
}

export interface SeatLeaveBy {
  at: Date;
  // The next item's Place, and the walk there from 관정관.
  placeId: string;
  walkMinutes: number;
}

// When to leave a seat for the first item that starts during the stay at a Place other than 관정관, by the walk there.
// None when that time is not after the stay's start or has passed. A seat keeps it whatever the walk, as board a6 does
// for a walk of 4 minutes: the 5-minute rule of a walk alone is for a meal or an event.
export function seatLeaveBy(
  items: readonly DayItem[],
  stay: SeatStay,
  walkingMinutes: (from: string, to: string) => number,
  now: Date,
): SeatLeaveBy | null {
  const from = Math.max(stay.startsAt.getTime(), now.getTime());
  const next = items
    .flatMap(({ start, placeId }) =>
      placeId !== null && placeId !== stay.placeId && start.getTime() >= from && start < stay.endsAt
        ? [{ start, placeId }]
        : [],
    )
    .toSorted((a, b) => a.start.getTime() - b.start.getTime())[0];
  if (next === undefined) {
    return null;
  }
  const walkMinutes = walkingMinutes(stay.placeId, next.placeId);
  const at = new Date(next.start.getTime() - walkMinutes * MINUTE_MS);
  return at.getTime() <= from ? null : { at, placeId: next.placeId, walkMinutes };
}
