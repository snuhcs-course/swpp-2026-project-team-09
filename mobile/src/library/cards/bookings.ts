/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import type { LibraryBooking } from '../replies';
import { dayAfter, dayWords, siteDate, siteInstant } from './times';

// The User's bookings, as getMyBookingList lists them: which a cancel or a return card acts on, which a row of 내 예약
// may cancel or return, and the words of a row.

// The days a cancel or a return card reads: from yesterday to three days on.
export function cancelPeriod(today: string): { start: string; end: string } {
  return { start: siteDate(dayAfter(today, -1)), end: siteDate(dayAfter(today, 3)) };
}

// The days 내 예약 reads: the card's period, else from a week ago to three days on.
export function myBookingsPeriod(
  today: string,
  period: { date: string | null; until: string | null } | null = null,
): { start: string; end: string } {
  if (period !== null && period.date !== null && period.until !== null) {
    return { start: siteDate(period.date), end: siteDate(period.until) };
  }
  return { start: siteDate(dayAfter(today, -7)), end: siteDate(dayAfter(today, 3)) };
}

// A booking still to come (1 awaiting approval, 2 booked) is cancelled; a seat in use (3 checked in) is returned.
export function canCancel({ STATUS }: Pick<LibraryBooking, 'STATUS'>): boolean {
  return STATUS === 1 || STATUS === 2;
}

export function canReturn({ STATUS }: Pick<LibraryBooking, 'STATUS'>): boolean {
  return STATUS === 3;
}

// The bookings a cancel or a return card acts on: those of its STATUS that match its target.
export function matchingBookings(
  bookings: readonly LibraryBooking[],
  { action, target, space }: Pick<LibraryCardData, 'action' | 'target' | 'space'>,
): LibraryBooking[] {
  const allows = action === 'return' ? canReturn : canCancel;
  return bookings.filter((booking) => {
    const { date, clock } = siteInstant(booking.USESTART);
    return (
      allows(booking) &&
      (target?.date === undefined || target.date === date) &&
      (target?.start === undefined || target.start === clock) &&
      (target?.spaceId === undefined || space?.id !== target.spaceId || booking.SECTORNO === space.sectorNo)
    );
  });
}

// A seat's label as a seat ("7193번") and a room's as its name ("G411").
export function seatWords(label: string): string {
  return /^\d+$/u.test(label) ? `${label}번` : label;
}

// "관정관 7층 7A 열람실 2 구역".
export function spaceWords(space: Pick<LibrarySpace, 'floor' | 'name'>): string {
  return `관정관 ${String(space.floor)}층 ${space.name}`;
}

// "7층 7A 열람실 · 7193번 · 오늘 17:00–18:00", a booking as a row shows it.
export function bookingWords(booking: LibraryBooking, now: Date): string {
  const start = siteInstant(booking.USESTART);
  const end = siteInstant(booking.USEEXPIRE);
  const where = `${booking.FLOOR_NAME} ${booking.ROOM_NAME}`;
  return `${where} · ${seatWords(booking.SEAT_VNAME)} · ${dayWords(start.date, now)} ${start.clock}–${end.clock}`;
}
