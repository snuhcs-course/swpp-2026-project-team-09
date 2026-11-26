/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { libraryCard, READING_ROOM } from '@/api/mock/data/library';
import { actingOn, bookingDeadline, shownBookings, ticketOfBooking } from '@/library/cards/bookings';
import { doneOf } from '@/library/cards/done';
import type { LibraryBooking } from '@/library/replies';
import { bookingRow } from './support/booking-row';

// What the phone shows after a booking (P01 ticket 15): the done message's ticket and its confirm time, which is the
// booked start + 30 minutes, whenever the seat was booked; the return card that offers to cancel a seat not yet in use;
// and the bookings 내 예약 shows.

const AT_0120 = new Date('2026-11-27T01:20:00+09:00');
const SEVEN = { date: '2026-11-27', start: '07:00', minutes: 360 };

function bookedAt(now: Date, start: string | null = null): ReturnType<typeof doneOf> {
  return doneOf(READING_ROOM, { slot: SEVEN, label: '8001', bseqno: '900001', notes: [], start }, now);
}

describe("the done message's confirm time", () => {
  it('is the booked start + 30 minutes, for a seat booked at 01:20 for 07:00', () => {
    expect(bookedAt(AT_0120).deadline).toEqual({ date: '2026-11-27', clock: '07:30' });
  });

  it('takes the start the library set when it differs from the one sent, and says so', () => {
    const done = bookedAt(AT_0120, '07:10');

    expect(done.deadline).toEqual({ date: '2026-11-27', clock: '07:40' });
    expect(done.moved).toBe('07:10');
    expect(bookedAt(AT_0120, '07:00').moved).toBeUndefined();
  });

  it('draws the seat as a booked ticket with no booking number', () => {
    expect(bookedAt(AT_0120).ticket).toEqual({
      state: 'booked',
      word: '예약됨',
      when: '오늘 07:00–13:00',
      room: '7층 열람실',
      unit: '좌석',
      seat: '8001번',
    });
    expect(bookedAt(AT_0120).rows).toEqual([]);
  });
});

const NOW = new Date('2026-11-02T16:00:00+09:00');
const BOOKED = bookingRow();
const IN_USE = bookingRow({ BSEQNO: 3000002, STATUS: 3, STATUS_NAME: '입실', USESTART: '2026-11-02 15:00:00' });
const RETURNED = bookingRow({ BSEQNO: 3000003, STATUS: 5, STATUS_NAME: '본인반납', USESTART: '2026-10-30 10:00:00' });
const RETURN = libraryCard('return:-', 'return', { target: {} });
const TODAY = '2026-11-02';

function numbers(bookings: readonly LibraryBooking[]): number[] {
  return bookings.map(({ BSEQNO }) => BSEQNO);
}

describe('a return card', () => {
  it('returns the seat in use', () => {
    const acting = actingOn([BOOKED, IN_USE], RETURN, TODAY);

    expect(acting.act).toBe('return');
    expect(numbers(acting.found)).toEqual([3000002]);
    expect(acting.instead).toBe(false);
  });

  it('offers to cancel a seat booked but not yet confirmed at the 좌석배정기, STATUS 1 or 2 (fault 1)', () => {
    for (const STATUS of [1, 2]) {
      const acting = actingOn([bookingRow({ STATUS })], RETURN, TODAY);

      expect(acting.act).toBe('cancel');
      expect(numbers(acting.found)).toEqual([3000001]);
      expect(acting.instead).toBe(true);
    }
  });

  it('finds nothing with no seat booked or in use', () => {
    expect(actingOn([RETURNED], RETURN, TODAY).found).toEqual([]);
  });

  it("offers no cancel for a room, or a seat of another day, in place of a return (PR 646's review)", () => {
    const room = bookingRow({ SEAT_VNAME: 'G411', USESTART: '2026-11-05 10:00:00', USEEXPIRE: '2026-11-05 12:00:00' });
    const tomorrow = bookingRow({ USESTART: '2026-11-03 09:00:00', USEEXPIRE: '2026-11-03 10:00:00' });

    expect(actingOn([room, tomorrow], RETURN, TODAY).found).toEqual([]);
  });
});

describe('the tickets of the bookings', () => {
  it('reads a booking as booked, in use until its end, or ended with its own word', () => {
    expect(ticketOfBooking(BOOKED, NOW)).toMatchObject({ state: 'booked', word: '예약됨', when: '오늘 17:00–18:00' });
    expect(ticketOfBooking(IN_USE, NOW)).toMatchObject({ state: 'using', word: '사용 중', when: '18:00까지' });
    expect(ticketOfBooking(BOOKED, NOW, '취소됨')).toMatchObject({ state: 'ended', when: '오늘 17:00–18:00' });
    expect(ticketOfBooking(BOOKED, NOW)).toMatchObject({ room: '7층 7A 열람실', unit: '좌석', seat: '7193번' });
    expect(ticketOfBooking(bookingRow({ SEAT_VNAME: 'G411' }), NOW)).toMatchObject({ unit: '방', seat: 'G411' });
  });

  it("gives a booked seat's confirm time from its start, and none to a room or a seat in use", () => {
    expect(bookingDeadline(BOOKED)).toEqual({ date: '2026-11-02', clock: '17:30' });
    expect(bookingDeadline(IN_USE)).toBeNull();
    expect(bookingDeadline(bookingRow({ SEAT_VNAME: 'G411' }))).toBeNull();
  });

  it('shows the bookings booked or in use, soonest first, and every one of a period that ended before today', () => {
    const later = bookingRow({ BSEQNO: 3000004, USESTART: '2026-11-03 09:00:00' });

    expect(numbers(shownBookings([later, RETURNED, BOOKED, IN_USE], { until: '2026-11-05' }, '2026-11-02'))).toEqual([
      3000002, 3000001, 3000004,
    ]);
    expect(numbers(shownBookings([RETURNED], { until: '2026-10-31' }, '2026-11-02'))).toEqual([3000003]);
  });
});
