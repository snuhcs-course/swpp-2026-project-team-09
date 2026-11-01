/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { clearLibraryLoggedIn, isLibraryLoggedIn } from './flag';
import type {
  LibraryBooking,
  LibraryRoomForm,
  LibraryRoomTimes,
  LibrarySeat,
  LibrarySeatInfo,
  LibrarySector,
  LibraryUserCheck,
  LibraryWriteResult,
} from './replies';
import { isLibraryEndpoint, isLibraryWrite, LIBRARY_ROOM_FORM, type LibraryEndpoint } from './site';
import type { LibraryTransport } from './transport';
import { LibraryError } from './errors';
import { ConfirmedPress } from './press';

export { isLibraryError, LIBRARY_FAILURE_TEXT, LibraryError, type LibraryFailure } from './errors';
export { ConfirmedPress, confirmedPress } from './press';

// The one way the app talks to 관정도서관: every read and write goes through a transport, the hidden web view in the
// app. The client never sees the session; it gets back the parsed JSON or an error kind. A session that ended clears
// the "logged in" flag. Nothing here retries by itself: a write that timed out is never sent again, and the card
// reloads 내 예약 to show what happened.

export interface SeatBooking {
  kind: 'seat';
  roomNo: number;
  sectorNo: number;
  // Minutes.
  useTime: number;
  // YYYYMMDD.
  bookDate: string;
  // HHMM-HHMM.
  bookTime: string;
  seatNo: number;
}

export interface RoomMember {
  name: string;
  schoolNo: string;
}

export interface RoomBooking {
  kind: 'room';
  roomNo: number;
  sectorNo: number;
  seatNo: number;
  bookDate: string;
  bookTime: string;
  useDesc: string;
  phoneNum: string;
  eMail: string;
  // The applicant first, then the companions.
  members: RoomMember[];
}

// The site's booking form for a seat or a room. `sMemberJsInfo` is "이름1,학번1,이름2,학번2,…" with the 학번 written
// without hyphens; a seat has none.
export function bookingBody(booking: SeatBooking | RoomBooking): Record<string, string> {
  if (booking.kind === 'seat') {
    return {
      roomNo: String(booking.roomNo),
      sectorNo: String(booking.sectorNo),
      useTime: String(booking.useTime),
      bookDate: booking.bookDate,
      bookTime: booking.bookTime,
      seatNo: String(booking.seatNo),
      sMemberJsInfo: '',
    };
  }
  return {
    roomNo: String(booking.roomNo),
    sectorNo: String(booking.sectorNo),
    seatNo: String(booking.seatNo),
    bookTime: booking.bookTime,
    bookDate: booking.bookDate,
    useDesc: booking.useDesc,
    phoneNum: booking.phoneNum,
    eMail: booking.eMail,
    sMemberJsInfo: booking.members.flatMap(({ name, schoolNo }) => [name, schoolNo.replaceAll('-', '')]).join(','),
  };
}

export interface RoomListQuery {
  // YYYYMMDD.
  date: string;
  roomNo: number;
  sectorNo: number;
  sectorName: string;
  roomName: string;
}

export interface SeatListQuery {
  roomNo: number;
  sectorNo: number;
  useTime: number;
  bookDate: string;
  bookTime: string;
}

export interface LibraryClient {
  sectors: (floorNo: number) => Promise<LibrarySector[]>;
  roomTimes: (query: RoomListQuery) => Promise<LibraryRoomTimes[]>;
  seats: (query: SeatListQuery) => Promise<LibrarySeat[]>;
  seatInfo: (sectorNo: number) => Promise<LibrarySeatInfo>;
  checkUser: (roomNo: number, member: RoomMember) => Promise<LibraryUserCheck>;
  // YYYYMMDD to YYYYMMDD. The site answers null for no booking, which is an empty list here.
  myBookings: (start: string, end: string) => Promise<LibraryBooking[]>;
  roomForm: () => Promise<LibraryRoomForm>;
  book: (booking: SeatBooking | RoomBooking, press: ConfirmedPress) => Promise<LibraryWriteResult>;
  // A cancel (STATUS 1 or 2) or a return (STATUS 3).
  cancel: (bseqno: number, press: ConfirmedPress) => Promise<LibraryWriteResult>;
}

// Where the client reads and clears the "logged in" flag; the flag module by default.
export interface LibraryFlag {
  isLoggedIn: () => Promise<boolean>;
  clear: () => Promise<void>;
}

const FLAG: LibraryFlag = { isLoggedIn: isLibraryLoggedIn, clear: clearLibraryLoggedIn };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A reply part that holds every field the app relies on.
function hasFields<T>(value: unknown, fields: readonly (keyof T & string)[]): value is T {
  return isRecord(value) && fields.every((field) => field in value);
}

// The list a reply holds under `key`, each item with `fields`; null is the site's "none". Anything else is a reply
// the client cannot read, which counts as `network`.
function listOf<T>(reply: unknown, key: string, fields: readonly (keyof T & string)[], endpoint: string): T[] {
  const list = isRecord(reply) ? reply[key] : undefined;
  if (list === null) {
    return [];
  }
  if (!Array.isArray(list)) {
    throw new LibraryError('network', endpoint);
  }
  return list.map((item: unknown) => {
    if (!hasFields<T>(item, fields)) {
      throw new LibraryError('network', endpoint);
    }
    return item;
  });
}

function recordOf<T>(value: unknown, fields: readonly (keyof T & string)[], endpoint: string): T {
  if (!hasFields<T>(value, fields)) {
    throw new LibraryError('network', endpoint);
  }
  return value;
}

type Send = (
  endpoint: LibraryEndpoint,
  body: Readonly<Record<string, string>>,
  press?: ConfirmedPress | null,
) => Promise<unknown>;

// The one way out to the transport. The allow-list and the confirmed press are checked here as in the script.
function sender(transport: LibraryTransport, flag: LibraryFlag): Send {
  return async (endpoint, body, press = null) => {
    if (!isLibraryEndpoint(endpoint) || (isLibraryWrite(endpoint) && !(press instanceof ConfirmedPress))) {
      throw new LibraryError('notAllowed', endpoint);
    }
    if (!(await flag.isLoggedIn())) {
      throw new LibraryError('noSession', endpoint);
    }
    const reply = await transport.call(endpoint, body);
    if (reply.ok) {
      return reply.result;
    }
    if (reply.error === 'sessionEnded') {
      await flag.clear();
    }
    throw new LibraryError(reply.error, endpoint);
  };
}

// The form getRoomList takes, as the site's own page sends it.
function roomListBody({ date, roomNo, sectorNo, sectorName, roomName }: RoomListQuery): Record<string, string> {
  return {
    searchDate: date,
    roomNo: String(roomNo),
    sectorNo: String(sectorNo),
    seatNo: '',
    TIME_START: '',
    TIME_END: '',
    ABLETIME: '',
    NAME: '',
    sectorName,
    roomName,
    tab_on: 'tabBooking',
    libNo: '1',
  };
}

type Reads = Pick<LibraryClient, 'sectors' | 'roomTimes' | 'seats' | 'seatInfo'>;

function placeReads(send: Send): Reads {
  return {
    sectors: async (floorNo) =>
      listOf<LibrarySector>(
        await send('getSectorList', { libno: '1', floorno: String(floorNo) }),
        'SectorList',
        ['SECTORNO', 'NAME', 'ROOMNO'],
        'getSectorList',
      ),
    roomTimes: async (query) =>
      listOf<LibraryRoomTimes>(
        await send('getRoomList', roomListBody(query)),
        'BookingTimeList',
        ['SEATNO', 'NAME', 'ABLETIME'],
        'getRoomList',
      ),
    seats: async ({ roomNo, sectorNo, useTime, bookDate, bookTime }) =>
      listOf<LibrarySeat>(
        await send('getSeatBookingList', {
          roomNo: String(roomNo),
          sectorNo: String(sectorNo),
          useTime: String(useTime),
          bookDate,
          bookTime,
          seatNo: '',
          sMemberJsInfo: '',
        }),
        'SeatList',
        ['SEATNO', 'VNAME', 'STATUS', 'USECNT'],
        'getSeatBookingList',
      ),
    seatInfo: async (sectorNo) => {
      const reply = await send('getSeatInfoFromList', { sectorNo: String(sectorNo) });
      return recordOf<LibrarySeatInfo>(
        isRecord(reply) ? reply.seatInfo : undefined,
        ['SEATNO', 'GR_MIN', 'GR_MAX'],
        'getSeatInfoFromList',
      );
    },
  };
}

type Mine = Pick<LibraryClient, 'checkUser' | 'myBookings' | 'roomForm' | 'book' | 'cancel'>;

function ownCalls(send: Send): Mine {
  return {
    checkUser: async (roomNo, { name, schoolNo }) =>
      recordOf<LibraryUserCheck>(
        await send('getUserCheck', {
          pRoomNo: String(roomNo),
          pUserName: name,
          pSchoolNo: schoolNo.replaceAll('-', ''),
        }),
        [],
        'getUserCheck',
      ),
    myBookings: async (start, end) =>
      listOf<LibraryBooking>(
        await send('getMyBookingList', { start, end }),
        'bookingList',
        ['BSEQNO', 'STATUS', 'USESTART'],
        'getMyBookingList',
      ),
    roomForm: async () =>
      recordOf<LibraryRoomForm>(
        await send(LIBRARY_ROOM_FORM, {}),
        ['tmpUserNames', 'tmpSchoolNos', 'phoneNum', 'eMail'],
        LIBRARY_ROOM_FORM,
      ),
    book: async (booking, press) =>
      recordOf<LibraryWriteResult>(await send('setRoomBooking', bookingBody(booking), press), [], 'setRoomBooking'),
    cancel: async (bseqno, press) =>
      recordOf<LibraryWriteResult>(
        await send('setCancelBooking', { bseqno: String(bseqno) }, press),
        [],
        'setCancelBooking',
      ),
  };
}

export function createLibraryClient(transport: LibraryTransport, flag: LibraryFlag = FLAG): LibraryClient {
  const send = sender(transport, flag);
  return { ...placeReads(send), ...ownCalls(send) };
}

export type LoginOutcome = 'loggedIn' | 'noSession' | 'failed';

// What a card's 로그인 does after "session ended" or "login needed": the login, then the action the User pressed,
// once. A second failure is the card's to show; nothing loops.
export async function retryAfterLogin<T>(logIn: () => Promise<LoginOutcome>, action: () => Promise<T>): Promise<T> {
  const outcome = await logIn();
  if (outcome !== 'loggedIn') {
    throw new LibraryError('noSession', null);
  }
  return action();
}

// Whether the session the login left works: one read through the transport, the User's own bookings for `today`
// (YYYYMMDD), answers with the site's JSON. The login starts from the site's main page, which the site may serve
// before it sends the User to the school's login, so reaching that page is not enough. The site's "log in" (HTTP 999,
// a redirect, a page that is not JSON) or any other failure is no session. It goes around the flag, which is set only
// once this answers.
export async function loginWorks(transport: LibraryTransport, today: string): Promise<boolean> {
  const reply = await transport.call('getMyBookingList', { start: today, end: today });
  return reply.ok && isRecord(reply.result) && 'bookingList' in reply.result;
}
