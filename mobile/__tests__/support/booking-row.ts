/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibraryBooking } from '@/library/replies';

// One of the User's bookings, as getMyBookingList lists it: a 7층 seat today at 17:00 unless told otherwise.
export function bookingRow(given: Partial<LibraryBooking> = {}): LibraryBooking {
  return {
    BSEQNO: 3000001,
    SEATNO: 17202001,
    USESTART: '2026-11-02 17:00:00',
    USEEXPIRE: '2026-11-02 18:00:00',
    STATUS: 2,
    STATUS_NAME: '예약',
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
