/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FakeLibrary, fakeTransport, TAKEN_SEAT_MESSAGE } from './support/kwanjeong/fake-library';
import {
  type ConfirmedPress,
  confirmedPress,
  createLibraryClient,
  isLibraryError,
  type LibraryClient,
  LibraryError,
  retryAfterLogin,
  type RoomBooking,
  type SeatBooking,
} from '@/library/client';
import { isLibraryLoggedIn, markLibraryLoggedIn } from '@/library/flag';

// The library client over the fake transport and the fake library, which serves the site's recorded responses, with
// the "logged in" flag in the phone's storage.

let library: FakeLibrary;
let client: LibraryClient;

beforeEach(async () => {
  await AsyncStorage.clear();
  await markLibraryLoggedIn();
  library = new FakeLibrary();
  client = createLibraryClient(fakeTransport(library));
});

function book(): ReturnType<LibraryClient['book']> {
  return client.book(SEAT, confirmedPress());
}

const SEAT: SeatBooking = {
  kind: 'seat',
  roomNo: 172,
  sectorNo: 17202,
  useTime: 60,
  bookDate: '20261101',
  bookTime: '1700-1800',
  seatNo: 17202001,
};

const ROOM: RoomBooking = {
  kind: 'room',
  roomNo: 121,
  sectorNo: 12103,
  seatNo: 12103001,
  bookDate: '20261101',
  bookTime: '1730-1900',
  useDesc: '과제',
  phoneNum: '010-0000-0000',
  eMail: 'student@example.com',
  members: [
    { name: '김새내', schoolNo: '2026-00001' },
    { name: '이친구', schoolNo: '2026-00002' },
  ],
};

async function failureOf(promise: Promise<unknown>): Promise<LibraryError> {
  try {
    await promise;
  } catch (error) {
    if (isLibraryError(error)) {
      return error;
    }
    throw error;
  }
  throw new Error('The call did not fail');
}

describe('the reads', () => {
  it("reads a floor's sectors", async () => {
    const sectors = await client.sectors(17);

    expect(sectors.map(({ SECTORNO }) => SECTORNO)).toContain(17202);
    expect(library.requests).toEqual([{ endpoint: 'getSectorList', body: { libno: '1', floorno: '17' } }]);
  });

  it("reads a room sector's free times on a date, with the site's own form", async () => {
    const rooms = await client.roomTimes({
      date: '20261101',
      roomNo: 121,
      sectorNo: 12103,
      sectorName: '6인실',
      roomName: '그룹스터디룸',
    });

    expect(rooms[0]?.NAME).toBe('G204');
    expect(rooms[0]?.ABLETIME).toContain('2026-11-01 17:30:00');
    expect(library.requests[0]?.body).toEqual({
      searchDate: '20261101',
      roomNo: '121',
      sectorNo: '12103',
      seatNo: '',
      TIME_START: '',
      TIME_END: '',
      ABLETIME: '',
      NAME: '',
      sectorName: '6인실',
      roomName: '그룹스터디룸',
      tab_on: 'tabBooking',
      libNo: '1',
    });
  });
});

describe('the reads of seats and people', () => {
  it("reads a reading room's seats for a time, a taken seat among them", async () => {
    library.takeSeat(17202001);

    const seats = await client.seats({
      roomNo: 172,
      sectorNo: 17202,
      useTime: 60,
      bookDate: '20261101',
      bookTime: '1700-1800',
    });

    expect(seats.length).toBeGreaterThan(100);
    expect(seats.find(({ SEATNO }) => SEATNO === 17202001)).toMatchObject({ STATUS: 2, USECNT: 1 });
    expect(library.requests[0]).toEqual({
      endpoint: 'getSeatBookingList',
      body: {
        roomNo: '172',
        sectorNo: '17202',
        useTime: '60',
        bookDate: '20261101',
        bookTime: '1700-1800',
        seatNo: '',
        sMemberJsInfo: '',
      },
    });
  });

  it("reads a sector's group sizes", async () => {
    await expect(client.seatInfo(12101)).resolves.toMatchObject({ GR_MIN: 11, GR_MAX: 20 });
  });
});

describe('the reads of the User', () => {
  it('checks a companion with the 학번 written without hyphens', async () => {
    await expect(client.checkUser(121, { name: '이친구', schoolNo: '2026-00002' })).resolves.toMatchObject({
      useCheckInfo: { NAME: '이친구', SCHOOLNO: '202600002' },
    });
    expect(library.requests[0]?.body).toEqual({ pRoomNo: '121', pUserName: '이친구', pSchoolNo: '202600002' });
  });

  it("reads the User's bookings, and none as an empty list", async () => {
    const some = await client.myBookings('20261001', '20261003');
    const none = await client.myBookings('20261101', '20261104');

    expect(some.length).toBeGreaterThan(0);
    expect(some.every(({ USESTART }) => USESTART.startsWith('2026-10-0'))).toBe(true);
    expect(none).toEqual([]);
  });

  it('reads the room form', async () => {
    await expect(client.roomForm()).resolves.toEqual({
      tmpUserNames: '김새내',
      tmpSchoolNos: '2026-00001',
      phoneNum: '010-0000-0000',
      eMail: 'student@example.com',
    });
  });
});

describe('the writes', () => {
  it("books a seat with the site's payload", async () => {
    const result = await client.book(SEAT, confirmedPress());

    expect(result.bookingResultInfo).toMatchObject({ SEATNO: 17202001 });
    expect(library.requests).toEqual([
      {
        endpoint: 'setRoomBooking',
        body: {
          roomNo: '172',
          sectorNo: '17202',
          useTime: '60',
          bookDate: '20261101',
          bookTime: '1700-1800',
          seatNo: '17202001',
          sMemberJsInfo: '',
        },
      },
    ]);
  });

  it('books a room with the applicant first and hyphen-free 학번', async () => {
    await client.book(ROOM, confirmedPress());

    expect(library.requests[0]?.body).toEqual({
      roomNo: '121',
      sectorNo: '12103',
      seatNo: '12103001',
      bookTime: '1730-1900',
      bookDate: '20261101',
      useDesc: '과제',
      phoneNum: '010-0000-0000',
      eMail: 'student@example.com',
      sMemberJsInfo: '김새내,202600001,이친구,202600002',
    });
  });

  it("gives the site's reason for a refused or taken booking", async () => {
    library.takeSeat(17202001);
    await expect(client.book(SEAT, confirmedPress())).resolves.toMatchObject({
      bookingFailInfo: { msg: TAKEN_SEAT_MESSAGE },
    });

    library.refuseBookings('예약 가능 시간이 아닙니다.');
    await expect(client.book({ ...SEAT, seatNo: 17202002 }, confirmedPress())).resolves.toMatchObject({
      bookingFailInfo: { msg: '예약 가능 시간이 아닙니다.' },
    });
  });
});

describe('the writes that are refused', () => {
  it('cancels or returns a booking by its number', async () => {
    await client.cancel(1000006, confirmedPress());

    expect(library.requests).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '1000006' } }]);
  });

  it("sends no write without a card's confirmed press", async () => {
    const fake: ConfirmedPress = { pressedAt: 0 };

    expect((await failureOf(client.book(SEAT, fake))).kind).toBe('notAllowed');
    expect((await failureOf(client.cancel(1, fake))).kind).toBe('notAllowed');
    expect(library.requests).toEqual([]);
  });

  it('never sends a write again after it failed on the network', async () => {
    library.answerNext('network');

    expect((await failureOf(client.book(SEAT, confirmedPress()))).kind).toBe('network');
    expect(library.requestsTo('setRoomBooking')).toHaveLength(1);
    await expect(isLibraryLoggedIn()).resolves.toBe(true);
  });
});

describe('the session', () => {
  it('asks for a login before any call when the User has none', async () => {
    await AsyncStorage.clear();

    expect((await failureOf(client.myBookings('20261001', '20261003'))).kind).toBe('noSession');
    expect(library.requests).toEqual([]);
  });

  it('clears the flag when the session ended, and retries the pressed action once after the login', async () => {
    library.answerNext('sessionEnded');

    expect((await failureOf(book())).kind).toBe('sessionEnded');
    await expect(isLibraryLoggedIn()).resolves.toBe(false);

    const logIn = jest.fn(async () => {
      await markLibraryLoggedIn();
      return 'loggedIn' as const;
    });
    const result = await retryAfterLogin(logIn, book);

    expect(logIn).toHaveBeenCalledTimes(1);
    expect(result.bookingResultInfo).toBeDefined();
    expect(library.requestsTo('setRoomBooking')).toHaveLength(2);
  });

  it('does not retry when the login was cancelled', async () => {
    const action = jest.fn(() => client.myBookings('20261001', '20261003'));

    expect((await failureOf(retryAfterLogin(() => Promise.resolve('noSession' as const), action))).kind).toBe(
      'noSession',
    );
    expect(action).not.toHaveBeenCalled();
  });
});

describe('what a failure carries', () => {
  it('holds no form field and no reply, in the error or in the log', async () => {
    const logged = [jest.spyOn(console, 'error'), jest.spyOn(console, 'warn'), jest.spyOn(console, 'log')];
    library.answerNext('network');

    const error = await failureOf(client.book(ROOM, confirmedPress()));

    const reported = [
      error.message,
      String(error),
      JSON.stringify(error),
      String(error.stack),
      JSON.stringify(logged.map((spy) => spy.mock.calls)),
    ].join('\n');
    for (const secret of ['010-0000-0000', 'student@example.com', '202600001', '김새내', '이친구', 'sMemberJsInfo']) {
      expect(reported).not.toContain(secret);
    }
    expect(error).toBeInstanceOf(LibraryError);
    expect(error.endpoint).toBe('setRoomBooking');
    for (const spy of logged) {
      spy.mockRestore();
    }
  });
});
