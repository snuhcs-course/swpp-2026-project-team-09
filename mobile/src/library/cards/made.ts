/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { now as clockNow } from '@/clock';
import { koreaDateKey } from '@/korea-time';
import type { Slot } from './payloads';
import { clockOf, minutesOf, nextStart, STEP_MINUTES } from './times';

// The library cards the app gives itself, in its own bubble: the seats card that 좌석 현황 보기 shows, and the book
// card of a seat tapped on the map. They are never sent back to the Assistant.

// A tapped seat is booked for 2 hours unless the card says otherwise.
const TAPPED_MINUTES = 120;

function card(key: string, action: LibraryCardData['action'], space: LibrarySpace, notes: string[]): LibraryCardData {
  return {
    key,
    action,
    space,
    date: null,
    start: null,
    minutes: null,
    seat: null,
    useDesc: null,
    useDescOptions: [],
    pledge: null,
    companions: [],
    questId: null,
    notes,
    until: null,
    target: null,
  };
}

// Keys as the main server writes them (`library-card.ts`), though these cards are never sent back.
export function seatsCardOf(space: LibrarySpace, notes: string[]): LibraryCardData {
  return card(`seats:${space.id}:${koreaDateKey(clockNow())}`, 'seats', space, notes);
}

// The time a tapped seat is booked for: today, from the card's start or the next 30 minutes, for the card's minutes or
// 2 hours, kept within the space's hours and its longest booking.
export function tappedSlot(
  space: LibrarySpace,
  now: Date,
  from: { start: string | null; minutes: number | null },
): Slot {
  const start = Math.max(minutesOf(from.start ?? nextStart(now)), minutesOf(space.hours.open));
  const room = minutesOf(space.hours.close) - start;
  const minutes = Math.min(from.minutes ?? TAPPED_MINUTES, space.maxMinutes, room);
  const stepped = Math.floor(minutes / STEP_MINUTES) * STEP_MINUTES;
  return { date: koreaDateKey(now), start: clockOf(start), minutes: Math.max(stepped, STEP_MINUTES) };
}

// The book card of a tapped seat, or of the first free seat when `label` is null.
export function seatBookCardOf(
  space: LibrarySpace,
  label: string | null,
  slot: Slot,
  notes: string[],
): LibraryCardData {
  const named = label === null ? '' : `:s=${label}`;
  const key = `book:${space.id}:${slot.date}:${slot.start.replace(':', '')}:${String(slot.minutes)}${named}`;
  return { ...card(key, 'book', space, notes), date: slot.date, start: slot.start, minutes: slot.minutes, seat: label };
}
