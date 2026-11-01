/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import {
  bookingWindow,
  checkKwanjeong,
  countsAsUsed,
  shownBooking,
  usedBooking,
} from '@/features/tutorial/kwanjeong-check';
import { LibraryError, type LoginOutcome } from '@/library/client';
import type { LibraryBooking } from '@/library/replies';

// The 관정 quest's check over a stand-in library client: the days it asks, which bookings count, the row it shows,
// and how a missing session, a cancelled login and a failed read end.

function booking(BSEQNO: number, STATUS: number, USESTART: string, USEEXPIRE = USESTART): LibraryBooking {
  return {
    BSEQNO,
    SEATNO: 17202001,
    USESTART,
    USEEXPIRE,
    STATUS,
    STATUS_NAME: '',
    FLOOR_NAME: '7층',
    ROOM_NAME: '7A 열람실',
    SECTOR_NAME: '7A 열람실 2 구역',
    SEAT_NAME: '7A 열람실 2구역-1',
    SEAT_VNAME: '7193',
    SECTORNO: 17202,
    ROOMNO: 172,
  };
}

const NOW = new Date('2026-10-04T03:00:00.000Z');

describe('the days asked', () => {
  it('are 30 days before today to 3 days after it, by Korea’s calendar', () => {
    expect(bookingWindow(NOW)).toEqual({ start: '20260904', end: '20261007' });
  });

  it('take the day in Korea, which is already the next one late in the UTC evening', () => {
    expect(bookingWindow(new Date('2026-10-03T16:00:00.000Z'))).toEqual({ start: '20260904', end: '20261007' });
    expect(bookingWindow(new Date('2026-10-03T14:59:00.000Z'))).toEqual({ start: '20260903', end: '20261006' });
  });

  it('cross the ends of months and years', () => {
    expect(bookingWindow(new Date('2026-12-30T03:00:00.000Z'))).toEqual({ start: '20261130', end: '20270102' });
    expect(bookingWindow(new Date('2026-03-01T03:00:00.000Z'))).toEqual({ start: '20260130', end: '20260304' });
  });
});

describe('a booking that counts', () => {
  it.each([
    [1, false],
    [2, true],
    [3, true],
    [4, true],
    [5, true],
    [6, false],
    [7, false],
  ])('STATUS %i counts: %s', (status, counts) => {
    expect(countsAsUsed({ STATUS: status })).toBe(counts);
  });

  it('is the most recent by its start, among those that count', () => {
    const rows = [
      booking(6, 7, '2026-10-03 18:00:00'),
      booking(5, 6, '2026-10-03 12:00:00'),
      booking(3, 4, '2026-10-01 18:00:00'),
      booking(2, 5, '2026-10-01 20:00:00'),
      booking(1, 4, '2026-10-01 15:30:00'),
    ];

    expect(usedBooking(rows)?.BSEQNO).toBe(2);
  });

  it('is found when the only one is a seat not returned (4)', () => {
    expect(usedBooking([booking(1, 4, '2026-10-01 15:30:00')])?.BSEQNO).toBe(1);
  });

  it('is none among no-shows and cancels only', () => {
    expect(usedBooking([booking(1, 6, '2026-10-03 12:00:00'), booking(2, 7, '2026-10-03 18:00:00')])).toBeNull();
    expect(usedBooking([])).toBeNull();
  });
});

describe("the booking's row", () => {
  it('names the room and the seat, and gives the day and the times', () => {
    expect(shownBooking(booking(1, 3, '2026-10-03 09:00:00', '2026-10-03 11:30:00'))).toEqual({
      title: '7A 열람실 · 7193번',
      when: '10월 3일 09:00–11:30 · 예약·이용 기록',
    });
  });
});

function loggedIn(): Promise<LoginOutcome> {
  return Promise.resolve('loggedIn');
}

describe('the check', () => {
  it('asks for the days of the window and gives the booking found', async () => {
    const myBookings = jest.fn(() => Promise.resolve([booking(1, 3, '2026-10-03 09:00:00', '2026-10-03 11:00:00')]));

    const result = await checkKwanjeong({ myBookings }, loggedIn, NOW);

    expect(myBookings.mock.calls).toEqual([['20260904', '20261007']]);
    expect(result).toEqual({
      kind: 'found',
      booking: { title: '7A 열람실 · 7193번', when: '10월 3일 09:00–11:00 · 예약·이용 기록' },
    });
  });

  it('opens the login without a session, then reads once more', async () => {
    const myBookings = jest
      .fn<Promise<LibraryBooking[]>, [string, string]>()
      .mockRejectedValueOnce(new LibraryError('noSession', 'getMyBookingList'))
      .mockResolvedValueOnce([]);
    const logIn = jest.fn(loggedIn);

    await expect(checkKwanjeong({ myBookings }, logIn, NOW)).resolves.toEqual({ kind: 'notFound' });
    expect(logIn).toHaveBeenCalledTimes(1);
    expect(myBookings).toHaveBeenCalledTimes(2);
  });

  it.each<LoginOutcome>(['noSession', 'failed'])('counts a login that ends %s as not found', async (outcome) => {
    const myBookings = jest.fn(() => Promise.reject(new LibraryError('noSession', 'getMyBookingList')));

    await expect(checkKwanjeong({ myBookings }, () => Promise.resolve(outcome), NOW)).resolves.toEqual({
      kind: 'notFound',
    });
    expect(myBookings).toHaveBeenCalledTimes(1);
  });

  it.each(['network', 'sessionEnded'] as const)('fails on a %s read, without the login', async (kind) => {
    const logIn = jest.fn(loggedIn);
    const myBookings = jest.fn(() => Promise.reject(new LibraryError(kind, 'getMyBookingList')));

    await expect(checkKwanjeong({ myBookings }, logIn, NOW)).resolves.toEqual({ kind: 'failed' });
    expect(logIn).not.toHaveBeenCalled();
  });
});
