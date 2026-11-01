/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibraryErrorKind } from '@/library/call-script';
import type { LibraryBooking } from '@/library/replies';
import type { LibraryEndpoint } from '@/library/site';
import type { LibraryTransport, TransportReply } from '@/library/transport';
import myBookings from './getMyBookingList_20260901-20261004.json';
import seatInfoFromList from './getSeatInfoFromList_all.json';
import sectorLists from './getSectorList_all.json';

// The fake 관정도서관: it serves the redacted responses recorded from the site (this folder's JSON files, copied from
// the P06 references) by endpoint and form fields, and records every request it receives. No test reaches the real
// site. It can be told to answer the next calls with an error kind, to refuse a booking with the site's
// `bookingFailInfo`, or to have a seat taken.

export interface FakeRequest {
  endpoint: LibraryEndpoint;
  body: Readonly<Record<string, string>>;
}

type Body = Readonly<Record<string, string>>;

// The room lists and seat lists recorded, by file name. `require.context` is not available here, so the files are
// read through Jest's own `require` from their names.
function recorded(name: string): unknown {
  try {
    // eslint-disable-next-line typescript/no-require-imports
    return require(`./${name}.json`) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A recorded file holds its request and its response, or (the room lists of 2026-11-02) the response alone.
function responseOf(file: unknown): unknown {
  if (!isRecord(file)) {
    return null;
  }
  return 'response' in file ? file.response : file;
}

// The fake applicant of the room form: fake values, as the eval world's.
export const FAKE_ROOM_FORM = {
  tmpUserNames: '김새내',
  tmpSchoolNos: '2026-00001',
  phoneNum: '010-0000-0000',
  eMail: 'student@example.com',
};

export const TAKEN_SEAT_MESSAGE = '이미 예약된 좌석입니다.';

// A booking cancelled (STATUS 7) or, once in use, returned (STATUS 5).
function ended(booking: LibraryBooking): LibraryBooking {
  const returned = booking.STATUS === 3;
  return Object.assign({}, booking, {
    STATUS: returned ? 5 : 7,
    STATUS_NAME: returned ? '본인반납' : '예약취소',
  });
}

// "2026-10-03 18:00:00" as the site's YYYYMMDD.
function day(text: string): string {
  return text.slice(0, 10).replaceAll('-', '');
}

export class FakeLibrary {
  readonly requests: FakeRequest[] = [];
  readonly logouts: number[] = [];
  private nextErrors: LibraryErrorKind[] = [];
  private failBookingWith: string | null = null;
  private readonly taken = new Set<string>();
  private lastBseqno = 2000000;
  // The User's bookings besides the recorded ones, such as one to cancel; and those cancelled or returned.
  private readonly added: LibraryBooking[] = [];
  private readonly cancelled = new Set<number>();
  private cancelFailWith: string | null = null;

  private held: (() => void)[] | null = null;

  // From now on a write is answered only on `release`, as a slow library would.
  holdWrites(): void {
    this.held = [];
  }

  release(): void {
    const waiting = this.held ?? [];
    this.held = null;
    for (const answer of waiting) {
      answer();
    }
  }

  // The answer of a call: at once, or for a held write, once released.
  reply(endpoint: LibraryEndpoint, body: Body): Promise<TransportReply> {
    const waiting = this.held;
    if (waiting === null || (endpoint !== 'setRoomBooking' && endpoint !== 'setCancelBooking')) {
      return Promise.resolve(this.answer(endpoint, body));
    }
    return new Promise((resolve) => {
      waiting.push(() => {
        resolve(this.answer(endpoint, body));
      });
    });
  }

  // A booking of the User's, which getMyBookingList lists with the recorded ones.
  addBooking(booking: LibraryBooking): void {
    this.added.push(booking);
  }

  refuseCancels(message: string): void {
    this.cancelFailWith = message;
  }

  // Every request made so far that changes a booking.
  writes(): FakeRequest[] {
    return this.requests.filter(({ endpoint }) => endpoint === 'setRoomBooking' || endpoint === 'setCancelBooking');
  }

  // The next calls answer these error kinds, one each, in order.
  answerNext(...errors: LibraryErrorKind[]): void {
    this.nextErrors.push(...errors);
  }

  refuseBookings(message: string): void {
    this.failBookingWith = message;
  }

  // A seat someone else just booked: taken in the seat lists, and refused when booked.
  takeSeat(seatNo: number): void {
    this.taken.add(String(seatNo));
  }

  requestsTo(endpoint: LibraryEndpoint): FakeRequest[] {
    return this.requests.filter((request) => request.endpoint === endpoint);
  }

  answer(endpoint: LibraryEndpoint, body: Body): TransportReply {
    this.requests.push({ endpoint, body });
    const error = this.nextErrors.shift();
    if (error !== undefined) {
      return { ok: false, error };
    }
    const result = this.result(endpoint, body);
    return result === undefined ? { ok: false, error: 'notAllowed' } : { ok: true, result };
  }

  private result(endpoint: LibraryEndpoint, body: Body): unknown {
    switch (endpoint) {
      case 'getSectorList':
        return sectorLists.find(({ req }) => req === `libno=${body.libno}&floorno=${body.floorno}`)?.body;
      case 'getRoomList':
        return responseOf(recorded(`getRoomList_${body.sectorNo}_${body.searchDate}`));
      case 'getSeatBookingList':
        return this.seatList(body);
      case 'getSeatInfoFromList':
        return (seatInfoFromList as Record<string, unknown>)[body.sectorNo];
      case 'getUserCheck':
        return { successYN: 'Y', useCheckInfo: { NAME: body.pUserName, SCHOOLNO: body.pSchoolNo } };
      case 'getMyBookingList':
        return this.bookings(body);
      case 'roomForm':
        return FAKE_ROOM_FORM;
      case 'setRoomBooking':
        return this.book(body);
      case 'setCancelBooking':
        return this.cancel(body);
      default:
        return undefined;
    }
  }

  private seatList(body: Body): unknown {
    const response = responseOf(recorded(`getSeatBookingList_${body.sectorNo}`));
    if (!isRecord(response) || !Array.isArray(response.SeatList)) {
      return response;
    }
    const seats = response.SeatList.map((seat: unknown) =>
      isRecord(seat) && this.taken.has(String(seat.SEATNO)) ? { ...seat, STATUS: 2, USECNT: 1 } : seat,
    );
    return { ...response, SeatList: seats };
  }

  private cancel({ bseqno }: Body): unknown {
    if (this.cancelFailWith !== null) {
      return { successYN: 'N', msg: this.cancelFailWith };
    }
    this.cancelled.add(Number(bseqno));
    return { successYN: 'Y' };
  }

  // The recorded and added bookings whose use starts within the asked dates, a cancelled one as 예약취소 and a
  // returned one as 본인반납; the site answers null for none.
  private bookings({ start, end }: Body): unknown {
    const all: LibraryBooking[] = [...this.added, ...myBookings.response.bookingList].map((booking) =>
      this.cancelled.has(booking.BSEQNO) ? ended(booking) : booking,
    );
    const list = all.filter(({ USESTART }) => day(USESTART) >= (start ?? '') && day(USESTART) <= (end ?? ''));
    return { ...myBookings.response, params: { start, end }, bookingList: list.length === 0 ? null : list };
  }

  private book(body: Body): unknown {
    if (this.failBookingWith !== null) {
      return { successYN: 'N', bookingFailInfo: { msg: this.failBookingWith } };
    }
    if (this.taken.has(body.seatNo ?? '')) {
      return { successYN: 'N', bookingFailInfo: { msg: TAKEN_SEAT_MESSAGE } };
    }
    this.lastBseqno += 1;
    return { successYN: 'Y', bookingResultInfo: { BSEQNO: this.lastBseqno, SEATNO: Number(body.seatNo) } };
  }
}

// The transport the tests give the library client: every call goes to the fake library.
export function fakeTransport(library: FakeLibrary = new FakeLibrary()): LibraryTransport & { library: FakeLibrary } {
  return {
    library,
    call: (endpoint, body) => library.reply(endpoint, body),
    logout: () => {
      library.logouts.push(Date.now());
      return Promise.resolve(true);
    },
  };
}
