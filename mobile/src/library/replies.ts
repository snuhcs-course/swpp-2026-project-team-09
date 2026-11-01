/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The parts of the site's replies that the app reads, as `references/kwanjeong-site.md` records them. A reply carries
// more fields; only these are relied on. Numbers come as numbers or strings depending on the endpoint.

export interface LibrarySector {
  SECTORNO: number;
  NAME: string;
  TYPENO: number;
  ROOMNO: number;
  ROOM_NAME: string;
  BOOKING_YN: string;
  SECTOR_IMAGE: string;
  MAPPOINT: string;
}

// One room of a sector on a date. ABLETIME lists the free 30-minute starts, such as "2026-11-01 17:30:00,…".
export interface LibraryRoomTimes {
  SEATNO: string;
  NAME: string;
  SECTORNO: string;
  ROOMNO: string;
  ABLETIME: string;
  OPENTIME: string;
  CLOSETIME: string;
}

// One seat or room of a sector for a time. Free is STATUS 1 and USECNT 0; STATUS 9 is an accessible seat.
export interface LibrarySeat {
  SEATNO: number;
  NAME: string;
  VNAME: string;
  SECTORNO: number;
  STATUS: number;
  USECNT: number;
  POSX: number;
  POSY: number;
  POSW: number;
  POSH: number;
  GR_MIN: number | string;
  GR_MAX: number | string;
}

export interface LibrarySeatInfo {
  SEATNO: number | string;
  NAME: string;
  VNAME: string;
  SECTORNO: number | string;
  GR_MIN: number | string;
  GR_MAX: number | string;
}

export interface LibraryUserCheck {
  useCheckInfo?: { NAME: string; SCHOOLNO: string };
  msg?: string;
}

// One booking of the User's. STATUS: 1 awaiting approval, 2 booked, 3 checked in, 4 not returned, 5 returned, 6
// no-show, 7 cancelled.
export interface LibraryBooking {
  BSEQNO: number;
  SEATNO: number;
  USESTART: string;
  USEEXPIRE: string;
  STATUS: number;
  STATUS_NAME: string;
  FLOOR_NAME: string;
  ROOM_NAME: string;
  SECTOR_NAME: string;
  SEAT_NAME: string;
  SEAT_VNAME: string;
  SECTORNO: number;
  ROOMNO: number;
}

// The room form's four values, which stay on the phone.
export interface LibraryRoomForm {
  tmpUserNames: string;
  tmpSchoolNos: string;
  phoneNum: string;
  eMail: string;
}

// What a booking or a cancel answers: the booking on success, or the site's reason.
export interface LibraryWriteResult {
  successYN?: string;
  bookingResultInfo?: Record<string, unknown>;
  bookingFailInfo?: Record<string, unknown>;
  msg?: string;
}
