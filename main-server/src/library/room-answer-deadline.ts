/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { addDays } from '../assistant/library/booking-rules.js';
import { koreaDate } from '../assistant/korea-time.js';

// A deadline falls at most 28 hours before the meeting's start: 20:00 the day before, for a start at 23:59.
export const DEADLINE_AHEAD_MS = 28 * 60 * 60 * 1000;

// When a companion still asked counts as out: 20:00 in Korea on the day before a meeting on a later day than the one
// they were asked on. None for a meeting on the same day, or for a companion asked at or after that hour.
export function answerDeadline(askedAt: Date, startsAt: Date): Date | null {
  const meetingDay = koreaDate(startsAt);
  if (meetingDay <= koreaDate(askedAt)) {
    return null;
  }
  const deadline = new Date(`${addDays(meetingDay, -1)}T20:00:00+09:00`);
  return askedAt < deadline ? deadline : null;
}
