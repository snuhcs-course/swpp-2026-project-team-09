/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { koreaDateKey } from '@/korea-time';
import { isLibraryError, type LibraryClient, type LoginOutcome } from '@/library/client';
import type { LibraryBooking } from '@/library/replies';

// The 관정 quest's check (P06 spec "The 관정 check"): the phone asks the library for the User's own bookings and
// looks for one that was booked or used. It only reads. The rows stay on the phone: what the sheet shows is made from
// them here, and the main server hears only how the quest was completed.

const DAY_MS = 24 * 60 * 60 * 1000;

// The days asked, as the site's YYYYMMDD: from 30 days before today to 3 days after it, by Korea's calendar.
export function bookingWindow(now: Date): { start: string; end: string } {
  const day = (days: number): string => koreaDateKey(new Date(now.getTime() + days * DAY_MS)).replaceAll('-', '');
  return { start: day(-30), end: day(3) };
}

// A booking that counts: 2 booked, 3 checked in, 4 not returned (the use time ran out, so the seat was used) and 5
// returned. 1 (awaiting approval), 6 (no-show) and 7 (cancelled) do not.
const USED_STATUSES: ReadonlySet<number> = new Set([2, 3, 4, 5]);

export function countsAsUsed(booking: Pick<LibraryBooking, 'STATUS'>): boolean {
  return USED_STATUSES.has(booking.STATUS);
}

// The most recent booking that counts, by its start ("2026-10-01 20:00:00" sorts as text), or null.
export function usedBooking(bookings: readonly LibraryBooking[]): LibraryBooking | null {
  let latest: LibraryBooking | null = null;
  for (const booking of bookings) {
    if (countsAsUsed(booking) && (latest === null || booking.USESTART > latest.USESTART)) {
      latest = booking;
    }
  }
  return latest;
}

// The booking's row in the sheet: "7A 열람실 · 7193번" / "10월 3일 18:00–19:00 · 예약·이용 기록". The site's times are
// Korea's.
export interface ShownBooking {
  title: string;
  when: string;
}

export function shownBooking(booking: LibraryBooking): ShownBooking {
  const { USESTART: start, USEEXPIRE: expire } = booking;
  const month = Number(start.slice(5, 7));
  const date = Number(start.slice(8, 10));
  return {
    title: `${booking.ROOM_NAME} · ${booking.SEAT_VNAME}번`,
    when: `${month}월 ${date}일 ${start.slice(11, 16)}–${expire.slice(11, 16)} · 예약·이용 기록`,
  };
}

export type KwanjeongCheck = { kind: 'found'; booking: ShownBooking } | { kind: 'notFound' } | { kind: 'failed' };

// Reads the bookings of the window. Without a library session the login opens first, and a login that did not end
// logged in (cancelled, or out of time) is "not found". Any failed read, the session ending mid-call included, is
// "failed". Nothing is retried by itself.
export async function checkKwanjeong(
  client: Pick<LibraryClient, 'myBookings'>,
  logIn: () => Promise<LoginOutcome>,
  now: Date,
): Promise<KwanjeongCheck> {
  const { start, end } = bookingWindow(now);
  const read = async (): Promise<KwanjeongCheck> => {
    const booking = usedBooking(await client.myBookings(start, end));
    return booking === null ? { kind: 'notFound' } : { kind: 'found', booking: shownBooking(booking) };
  };
  try {
    return await read();
  } catch (error) {
    if (!isLibraryError(error) || error.kind !== 'noSession') {
      return { kind: 'failed' };
    }
  }
  if ((await logIn()) !== 'loggedIn') {
    return { kind: 'notFound' };
  }
  try {
    return await read();
  } catch {
    return { kind: 'failed' };
  }
}
