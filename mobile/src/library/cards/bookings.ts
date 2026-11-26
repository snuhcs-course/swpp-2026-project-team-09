/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import type { LibraryBooking } from '../replies';
import { roomLabelOfSector } from './seat-rooms';
import { dayAfter, dayWords, kioskDeadline, siteDate, siteInstant } from './times';

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

// What a cancel or a return card acts on (P01 ticket 15): a return finds the seat in use, else a seat of today booked
// and not yet in use, which it offers to cancel `instead`: a seat is returned only once it is confirmed at the
// 좌석배정기. A room, or a seat of another day, is never offered in place of a return (PR 646's review).
export function actingOn(
  bookings: readonly LibraryBooking[],
  card: Pick<LibraryCardData, 'action' | 'target' | 'space'>,
  today: string,
): { act: 'cancel' | 'return'; found: LibraryBooking[]; instead: boolean } {
  if (card.action !== 'return') {
    return { act: 'cancel', found: matchingBookings(bookings, card), instead: false };
  }
  const inUse = matchingBookings(bookings, card);
  const booked =
    inUse.length === 0
      ? matchingBookings(bookings, { ...card, action: 'cancel' }).filter(
          (booking) => isSeat(booking.SEAT_VNAME) && siteInstant(booking.USESTART).date === today,
        )
      : [];
  return booked.length === 0
    ? { act: 'return', found: inUse, instead: false }
    : { act: 'cancel', found: booked, instead: true };
}

// The bookings 내 예약 shows (P01 ticket 15): those booked or in use, soonest first; a period that ended before today,
// every one of it, as it ended.
export function shownBookings(
  bookings: readonly LibraryBooking[],
  { until }: { until: string | null },
  today: string,
): LibraryBooking[] {
  const past = until !== null && until < today;
  const shown = past ? bookings : bookings.filter((booking) => canCancel(booking) || canReturn(booking));
  return shown.toSorted((one, other) => one.USESTART.localeCompare(other.USESTART));
}

// A booking as its ticket shows it (P01 ticket 15): booked, in use, or ended with the word given; its time, its room,
// and its seat or room.
export interface TicketView {
  state: 'booked' | 'using' | 'ended';
  // "예약됨", "사용 중", or how it ended ("취소됨").
  word: string;
  // "오늘 17:00–18:00", or the end of a seat in use ("18:00까지").
  when: string;
  room: string;
  unit: '좌석' | '방';
  // "7193번", or a room's name ("G411").
  seat: string;
}

function isSeat(label: string): boolean {
  return /^\d+$/u.test(label);
}

export function ticketOfBooking(booking: LibraryBooking, now: Date, ended: string | null = null): TicketView {
  const start = siteInstant(booking.USESTART);
  const end = siteInstant(booking.USEEXPIRE);
  const using = ended === null && canReturn(booking);
  return {
    state: ended === null ? (using ? 'using' : 'booked') : 'ended',
    word: ended ?? (using ? '사용 중' : '예약됨'),
    when: using ? `${end.clock}까지` : `${dayWords(start.date, now)} ${start.clock}–${end.clock}`,
    room: roomLabelOfSector(booking.SECTORNO) ?? `${booking.FLOOR_NAME} ${booking.ROOM_NAME}`,
    unit: isSeat(booking.SEAT_VNAME) ? '좌석' : '방',
    seat: seatWords(booking.SEAT_VNAME),
  };
}

// The day and time by which a seat is confirmed at the 좌석배정기.
export interface Deadline {
  date: string;
  clock: string;
}

// A booked seat's: its start + 30 minutes; none for a room, or a seat already in use.
export function bookingDeadline(booking: LibraryBooking): Deadline | null {
  if (!canCancel(booking) || !isSeat(booking.SEAT_VNAME)) {
    return null;
  }
  const { date, clock } = siteInstant(booking.USESTART);
  return { date, clock: kioskDeadline(clock) };
}

// A seat's label as a seat ("7193번") and a room's as its name ("G411").
export function seatWords(label: string): string {
  return isSeat(label) ? `${label}번` : label;
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
