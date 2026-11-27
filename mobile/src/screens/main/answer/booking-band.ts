/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useState } from 'react';
import type { LibrarySpace, MealInput, TimeBand } from '@/api/assistant-types';
import type { Quest } from '@/api/types';
import { now } from '@/clock';
import { fixedOnDay, wordsOn } from '@/features/assistant/booking-day';
import type { BandBound, Stretch } from '@/features/assistant/time-band';
import { koreaClock, koreaDateKey, koreaMinutes } from '@/korea-time';
import type { Slot } from '@/library/cards/payloads';
import { limitsOf, type Span, type SpanLimits, slotOf, spanOf } from '@/library/cards/slot-band';
import { clockOf, minutesOf } from '@/library/cards/times';

// A seat booking's band in the time card a meal's draws (P01 ticket 14): its span, the rest of the room's day as the
// range (ticket 17), the
// User's Classes and Quests of the day as their lane's busy stretches, the words the card said, and the library's rules,
// which the band's handles and whole moves follow.

// The lane of the User, the band's first.
const ME = 'me';

function onDay(date: string, minutes: number): string {
  return `${date}T${clockOf(minutes)}:00+09:00`;
}

const HOUR = 60;
// The range is at least this wide, so that an hour of the band stays wide enough to hold (P01 ticket 17).
const RANGE_LEAST = 4 * HOUR;

function hourOf(minutes: number): number {
  return Math.floor(minutes / HOUR) * HOUR;
}

// The range the time card shows a booking's day over (P01 ticket 17): today, from the moment the answer came floored
// to the hour to closing, starting earlier to keep RANGE_LEAST, never before opening nor after the span's start; the
// hours gone by are no use, since the library books today's seats only from now on. Another day, opening to closing.
function rangeOf(limits: SpanLimits, span: Span, date: string, shownAt: Date): Span {
  if (date !== koreaDateKey(shownAt)) {
    return { start: limits.open, end: limits.close };
  }
  const start = Math.min(hourOf(koreaMinutes(shownAt)), limits.close - RANGE_LEAST, hourOf(span.start));
  return { start: Math.max(limits.open, start), end: limits.close };
}

// `shownAt`, the moment the answer came, sets the range, which stays while the card is open; `at`, now, sets the line
// of now and the earliest start. The Classes the conversation leaves out (`skipped`, their ids, P01 ticket 40) are
// free: off the lane and out of the card's words, drawn apart as every answer's band draws them.
export function bookingBandOf(
  slot: Slot,
  space: LibrarySpace,
  quests: readonly Quest[],
  at: Date,
  shownAt: Date = at,
  skipped: readonly string[] = [],
): TimeBand {
  const { date } = slot;
  const limits = limitsOf(space, date, at);
  const span = spanOf(slot);
  const day = fixedOnDay(quests, date, span);
  const leftOut = day.filter(({ id, isClass }) => isClass && skipped.includes(id));
  const fixed = day.filter((thing) => !leftOut.includes(thing));
  const range = rangeOf(limits, span, date, shownAt);
  return {
    range: { startAt: onDay(date, range.start), endAt: onDay(date, range.end) },
    now: at.toISOString(),
    lanes: [
      {
        userId: ME,
        name: '나',
        busy: fixed.map(({ start, end, words }) => ({
          startAt: onDay(date, start),
          endAt: onDay(date, end),
          label: words,
        })),
      },
    ],
    ...(leftOut.length === 0
      ? {}
      : {
          skipped: leftOut.map(({ id, start, end, words }) => ({
            id,
            startAt: onDay(date, start),
            endAt: onDay(date, end),
            label: words,
          })),
        }),
    startAt: onDay(date, span.start),
    endAt: onDay(date, span.end),
    text: wordsOn(span, fixed).words,
    rules: {
      stepMinutes: limits.step,
      leastMinutes: limits.least,
      mostMinutes: limits.most,
      earliest: onDay(date, limits.earliest),
    },
  };
}

function spanAt({ startAt, endAt }: Stretch): Span {
  return { start: minutesOf(koreaClock(startAt)), end: minutesOf(koreaClock(endAt)) };
}

// The slot with one end let go at `clock`, which the band's rules already kept in bounds.
export function droppedSlot(slot: Slot, bound: BandBound, clock: string): Slot {
  const span = spanOf(slot);
  const at = minutesOf(clock);
  return slotOf(slot.date, bound === 'from' ? { start: at, end: span.end } : { start: span.start, end: at });
}

export interface BookingBand {
  band: TimeBand;
  // The booking's own time, over which a Class or Quest it runs into is drawn red, as a meal's fixed window is.
  fixed: MealInput['window'];
  focus: null;
  disabled: boolean;
  onDrop: (bound: BandBound, clock: string) => void;
  onMove: (at: Stretch, letGo: boolean) => void;
  moving: Stretch | null;
  // A Class left out put back by its ✕: back on the lane, with the card's own clash words, the slot kept (P01 ticket 40).
  onPutBack?: (classId: string) => void;
}

// The band's props for the time card: a handle let go or stepped, and the band let go after a whole move, keep the new
// slot with the chat as the card's band did.
export function useBookingBand(
  slot: Slot,
  space: LibrarySpace,
  quests: readonly Quest[],
  keep: (slot: Slot) => void,
  // The conversation's Classes left out on the slot's date, by id, and how a ✕ puts one back (P01 ticket 40).
  skipped?: { ids: readonly string[]; putBack?: (classId: string) => void },
): BookingBand {
  const [moving, setMoving] = useState<Stretch | null>(null);
  // The moment the answer came, whose range the card keeps (P01 ticket 17).
  const [shownAt] = useState(now);
  const span = spanOf(slot);
  return {
    band: bookingBandOf(slot, space, quests, now(), shownAt, skipped?.ids),
    fixed: { from: clockOf(span.start), until: clockOf(span.end) },
    focus: null,
    disabled: false,
    onDrop: (bound, clock) => {
      keep(droppedSlot(slot, bound, clock));
    },
    onMove: (at, letGo) => {
      setMoving(letGo ? null : at);
      if (letGo) {
        keep(slotOf(slot.date, spanAt(at)));
      }
    },
    moving,
    ...(skipped?.putBack === undefined ? {} : { onPutBack: skipped.putBack }),
  };
}
