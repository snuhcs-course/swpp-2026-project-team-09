/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { now } from '@/clock';
import { koreaDateKey } from '@/korea-time';
import { dayAfter } from '@/library/cards/times';
import type { LibraryBooking } from '@/library/replies';
import type { LibraryTransport, TransportReply } from '@/library/transport';

// The mock build's 관정도서관 bookings (A04 ticket 11), so that 오늘's 예약 and the AI's 내 예약 show tickets without the
// site: a seat in use until two hours on, a seat booked for this evening, and a group study room tomorrow. A cancel or a
// return takes one off. Every other call goes to the site through the hidden view, as in a released build.

function booking(
  given: Pick<LibraryBooking, 'BSEQNO' | 'USESTART' | 'USEEXPIRE' | 'STATUS'> & Partial<LibraryBooking>,
): LibraryBooking {
  return {
    SEATNO: 17202001,
    STATUS_NAME: given.STATUS === 3 ? '사용중' : '예약',
    FLOOR_NAME: '7층',
    ROOM_NAME: '7A 열람실',
    SECTOR_NAME: '7A 열람실 2 구역',
    SEAT_NAME: '7A 열람실 2구역-1',
    SEAT_VNAME: '7193',
    SECTORNO: 17202,
    ROOMNO: 172,
    ...given,
  };
}

function clock(hour: number): string {
  return `${String(Math.min(Math.max(hour, 0), 23)).padStart(2, '0')}:00:00`;
}

// Made when first read, around the mock clock's now.
function bookingsNow(): LibraryBooking[] {
  const today = koreaDateKey(now());
  const tomorrow = dayAfter(today, 1);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Seoul' }).format(now()),
  );
  return [
    booking({
      BSEQNO: 9000001,
      USESTART: `${today} ${clock(hour - 1)}`,
      USEEXPIRE: `${today} ${clock(hour + 2)}`,
      STATUS: 3,
    }),
    booking({
      BSEQNO: 9000002,
      USESTART: `${today} 19:00:00`,
      USEEXPIRE: `${today} 21:00:00`,
      STATUS: 2,
      SEATNO: 17202088,
      SEAT_VNAME: '7280',
    }),
    booking({
      BSEQNO: 9000003,
      USESTART: `${tomorrow} 10:00:00`,
      USEEXPIRE: `${tomorrow} 12:00:00`,
      STATUS: 2,
      SEATNO: 0,
      FLOOR_NAME: '4층',
      ROOM_NAME: '그룹스터디실',
      SECTOR_NAME: '그룹스터디실',
      SEAT_NAME: 'G411',
      SEAT_VNAME: 'G411',
      SECTORNO: 0,
      ROOMNO: 0,
    }),
  ];
}

function day(instant: string): string {
  return instant.slice(0, 10).replaceAll('-', '');
}

export function mockLibraryTransport(site: LibraryTransport): LibraryTransport {
  let held: LibraryBooking[] | null = null;
  const mine = (): LibraryBooking[] => {
    held ??= bookingsNow();
    return held;
  };
  return {
    call: (endpoint, body): Promise<TransportReply> => {
      if (endpoint === 'getMyBookingList') {
        const list = mine().filter(
          ({ USESTART }) => day(USESTART) >= (body.start ?? '') && day(USESTART) <= (body.end ?? ''),
        );
        return Promise.resolve({ ok: true, result: { successYN: 'Y', bookingList: list.length === 0 ? null : list } });
      }
      if (endpoint === 'setCancelBooking') {
        held = mine().filter(({ BSEQNO }) => String(BSEQNO) !== body.bseqno);
        return Promise.resolve({ ok: true, result: { successYN: 'Y' } });
      }
      return site.call(endpoint, body);
    },
    logout: () => site.logout(),
  };
}
