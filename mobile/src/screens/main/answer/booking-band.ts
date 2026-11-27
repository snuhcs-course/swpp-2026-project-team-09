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
import { koreaClock } from '@/korea-time';
import type { Slot } from '@/library/cards/payloads';
import { limitsOf, type Span, slotOf, spanOf } from '@/library/cards/slot-band';
import { clockOf, minutesOf } from '@/library/cards/times';

// A seat booking's band in the time card a meal's draws (P01 ticket 14): its span, the room's hours as the range, the
// User's Classes and Quests of the day as their lane's busy stretches, the words the card said, and the library's rules,
// which the band's handles and whole moves follow.

// The lane of the User, the band's first.
const ME = 'me';

function onDay(date: string, minutes: number): string {
  return `${date}T${clockOf(minutes)}:00+09:00`;
}

export function bookingBandOf(slot: Slot, space: LibrarySpace, quests: readonly Quest[], at: Date): TimeBand {
  const { date } = slot;
  const limits = limitsOf(space, date, at);
  const span = spanOf(slot);
  const fixed = fixedOnDay(quests, date, span);
  return {
    range: { startAt: onDay(date, limits.open), endAt: onDay(date, limits.close) },
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
}

// The band's props for the time card: a handle let go or stepped, and the band let go after a whole move, keep the new
// slot with the chat as the card's band did.
export function useBookingBand(
  slot: Slot,
  space: LibrarySpace,
  quests: readonly Quest[],
  keep: (slot: Slot) => void,
): BookingBand {
  const [moving, setMoving] = useState<Stretch | null>(null);
  const span = spanOf(slot);
  return {
    band: bookingBandOf(slot, space, quests, now()),
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
  };
}
